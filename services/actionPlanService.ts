
import type { SitewideAnalysis, SeoAnalysisResult, DailyActionPlan, AiConfig, ActionItem } from '../types';
import { callAi } from './aiService';
import { 
    ACTION_PLAN_SKELETON_SYSTEM_INSTRUCTION, 
    ACTION_PLAN_USER_PROMPT_TEMPLATE,
    ACTION_ITEM_DETAIL_SYSTEM_INSTRUCTION,
    ACTION_ITEM_DETAIL_USER_PROMPT_TEMPLATE,
} from '../constants';
import { withRetry, robustJsonParse, slugify, executeConcurrent } from '../utils/utility';

type ActionItemSkeleton = Omit<ActionItem, 'stepByStepImplementation' | 'prompts' | 'verificationChecklist' | 'successVerification' | 'nextSteps' | 'toolsRequired' | 'completed'>;
type ActionItemDetails = Pick<ActionItem, 'stepByStepImplementation' | 'prompts' | 'verificationChecklist' | 'successVerification' | 'nextSteps' | 'toolsRequired'>;


// Validator for the skeleton plan. Simpler and more reliable.
const validateDailyActionPlanSkeleton = (data: any): data is { actionPlan: { day: number; focus: string; actions: ActionItemSkeleton[] }[] } => {
    if (!data || typeof data !== 'object' || !Array.isArray(data.actionPlan)) return false;
    const plan = data.actionPlan;
    for (const day of plan) {
        if (typeof day.day !== 'number' || typeof day.focus !== 'string' || !Array.isArray(day.actions)) return false;
        for (const action of day.actions) {
            if (typeof action.id !== 'string' || typeof action.title !== 'string') return false;
        }
    }
    return true;
};

// Validator for the details of a single action item.
const validateActionItemDetails = (data: any): data is ActionItemDetails => {
    return (
        data &&
        Array.isArray(data.toolsRequired) &&
        Array.isArray(data.stepByStepImplementation) &&
        Array.isArray(data.prompts) &&
        Array.isArray(data.verificationChecklist) &&
        Array.isArray(data.successVerification) &&
        Array.isArray(data.nextSteps)
    );
};


const generateActionItemDetails = async (
    aiConfig: AiConfig,
    fullAnalysisJson: string,
    actionItemTitle: string
): Promise<ActionItemDetails> => {
    const userPrompt = ACTION_ITEM_DETAIL_USER_PROMPT_TEMPLATE
        .replace('${actionItemTitle}', actionItemTitle)
        .replace('${analysisJson}', fullAnalysisJson);

    const { text } = await callAi(
        aiConfig,
        ACTION_ITEM_DETAIL_SYSTEM_INSTRUCTION,
        userPrompt,
        { responseMimeType: 'application/json' }
    );

    return robustJsonParse(text, validateActionItemDetails, `ActionItemDetails for "${actionItemTitle}"`);
};


export const generateActionPlan = async (
    aiConfig: AiConfig,
    sitewideAnalysis: SitewideAnalysis,
    seoAnalysis: SeoAnalysisResult,
    onLog: (message: string) => void
): Promise<DailyActionPlan[]> => {
    onLog("Constructing master prompt for action plan skeleton...");

    const fullAnalysisData = { sitewideAnalysis, seoAnalysis };
    const fullAnalysisJson = JSON.stringify(fullAnalysisData, null, 2);

    // --- STAGE 1: Generate the reliable skeleton plan ---
    let skeletonResponse: { actionPlan: { day: number; focus: string; actions: ActionItemSkeleton[] }[] };
    try {
        skeletonResponse = await withRetry(async () => {
            const userPrompt = ACTION_PLAN_USER_PROMPT_TEMPLATE.replace('${analysisJson}', fullAnalysisJson);

            onLog(`Sending request to ${aiConfig.provider} for the plan skeleton...`);
            const { text } = await callAi(aiConfig, ACTION_PLAN_SKELETON_SYSTEM_INSTRUCTION, userPrompt, { responseMimeType: 'application/json', concurrencyStrategy: aiConfig.strategy, ...(aiConfig.stageOverrides?.actionPlan?.model ? { modelOverride: aiConfig.stageOverrides.actionPlan.model } : {}) });

            onLog(`Received plan skeleton. Validating structure...`);
            const result = robustJsonParse(text, validateDailyActionPlanSkeleton, 'FullActionPlanSkeleton');
            onLog('Validated plan skeleton.');
            return result;
        });
    } catch (e) {
        console.error('Action plan skeleton generation failed, falling back to local skeleton:', e);
        // Fallback: Build a minimal skeleton from available analysis so the app never fails hard
        const pageActions = seoAnalysis?.pageActions || [];
        const actions: ActionItemSkeleton[] = pageActions.slice(0, Math.min(24, pageActions.length)).map((a: any, idx: number) => ({
            id: slugify(a.title || `action-${idx+1}`),
            title: a.title || `Task ${idx+1}`,
            type: (a.type as any) || 'content_update',
            priority: (a.priority as any) || 'medium',
            impact: typeof a.impact === 'number' ? a.impact : 6,
            estimatedTime: a.estimatedTime || '1-2 hours',
            dependencies: Array.isArray(a.dependencies) ? a.dependencies : [],
        }));
        const days = Math.max(3, Math.ceil(actions.length / 6));
        const plan = Array.from({ length: days }, (_, i) => ({
            day: i + 1,
            focus: i === 0 ? 'High-Impact Quick Wins' : i === 1 ? 'Content Refresh & Fixes' : 'New Content & Linking',
            actions: actions.slice(i * 6, (i + 1) * 6),
        }));
        skeletonResponse = { actionPlan: plan };
        onLog('Using fallback local skeleton plan.');
    }

    const skeletonPlan = skeletonResponse.actionPlan;

    if (!skeletonPlan || skeletonPlan.length === 0) {
        return [];
    }

    // --- STAGE 2: Concurrently generate details for each action item ---
    onLog("Generating implementation details for all action items...");
    
    const allActionsWithDay: { dayIndex: number; actionIndex: number; action: ActionItemSkeleton }[] = skeletonPlan.flatMap((day, dayIndex) => 
        day.actions.map((action, actionIndex) => ({ dayIndex, actionIndex, action }))
    );
    
    const CONCURRENCY_LIMIT = 5;

    const detailResults = await executeConcurrent(
        allActionsWithDay,
        (task) => generateActionItemDetails(aiConfig, fullAnalysisJson, task.action.title),
        CONCURRENCY_LIMIT,
        ({ completed, total }) => {
            onLog(`Generating details for task ${completed} of ${total}...`);
        }
    );

    // --- STAGE 3: Merge the details back into the skeleton plan ---
    const finalPlan: DailyActionPlan[] = JSON.parse(JSON.stringify(skeletonPlan));

    detailResults.forEach((result, i) => {
        const { dayIndex, actionIndex, action } = allActionsWithDay[i];
        
        if (result.status === 'fulfilled') {
            const details = result.value;
            const fullAction: ActionItem = {
                ...action,
                ...details,
                id: action.id || slugify(action.title),
                completed: false, // Initialize as not completed
            };
            finalPlan[dayIndex].actions[actionIndex] = fullAction;
        } else {
            console.error(`Failed to generate details for task "${action.title}":`, result.reason);
            // Even if details fail, keep the skeleton action item so the plan isn't empty
            const skeletonAction: ActionItem = {
                ...action,
                id: action.id || slugify(action.title),
                stepByStepImplementation: ["Error: Could not generate implementation steps."],
                prompts: [],
                verificationChecklist: [],
                successVerification: [],
                nextSteps: [],
                toolsRequired: [],
                completed: false,
            };
            finalPlan[dayIndex].actions[actionIndex] = skeletonAction;
        }
    });

    onLog('Successfully assembled the full day-by-day action plan.');
    return finalPlan;
}

import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import Anthropic from '@anthropic-ai/sdk';
import { getSystemInstruction, USER_PROMPT_TEMPLATE, getSitewideAuditSystemInstruction, SITEWIDE_AUDIT_USER_PROMPT_TEMPLATE, COMPETITOR_DISCOVERY_SYSTEM_INSTRUCTION, EXECUTIVE_SUMMARY_SYSTEM_INSTRUCTION, EXECUTIVE_SUMMARY_USER_PROMPT_TEMPLATE, SELF_CORRECTION_SYSTEM_INSTRUCTION, SELF_CORRECTION_USER_PROMPT_TEMPLATE, SERP_DECONSTRUCTION_SYSTEM_INSTRUCTION, SERP_DECONSTRUCTION_USER_PROMPT_TEMPLATE } from '../constants';
import type { SeoAnalysisResult, GroundingSource, AnalysisType, SnippetOpportunity, SerpInsights, SitewideAnalysis, PagePerformance, AiConfig, ActionItem, ExecutiveSummary, GenerateContentParameters } from "../types";
import { withRetry, promiseAny, CustomAggregateError, robustJsonParse } from "../utils/utility";

// --- AI HARDENING: RETRY LOGIC & ROBUST PARSING ---

const validateSeoAnalysisResult = (data: any): data is SeoAnalysisResult => {
    return 'pageActions' in data && 'keywords' in data && Array.isArray(data.pageActions) && Array.isArray(data.keywords);
}

const validateSitewideAnalysis = (data: any): data is SitewideAnalysis => (
    'strategicRoadmap' in data &&
    'technicalHealth' in data &&
    'contentGaps' in data &&
    'topicClusters' in data &&
    'siteArchitectureGraph' in data &&
    'localBusinessAudit' in data &&
    'zeroToOneInitiatives' in data &&
    Array.isArray(data.contentGaps) &&
    Array.isArray(data.topicClusters) &&
    Array.isArray(data.zeroToOneInitiatives) &&
    typeof data.strategicRoadmap.projectedImpactScore === 'number'
);

const validateExecutiveSummary = (data: any): data is ExecutiveSummary => {
  return (
    'summaryTitle' in data && typeof data.summaryTitle === 'string' &&
    'summaryIntroduction' in data && typeof data.summaryIntroduction === 'string' &&
    'rewrites' in data && Array.isArray(data.rewrites) &&
    'optimizations' in data && Array.isArray(data.optimizations) &&
    'newContent' in data && Array.isArray(data.newContent) &&
    'redirects' in data && Array.isArray(data.redirects) &&
    'contentDecay' in data && Array.isArray(data.contentDecay)
  );
};


// --- UNIVERSAL AI CALL FUNCTION ---
interface CallAiOptions {
    useGoogleSearch?: boolean;
    responseMimeType?: 'application/json' | 'text/plain';
    concurrencyStrategy?: 'parallel' | 'single' | 'fallback'; // For OpenRouter multi-model
    modelOverride?: string; // Prefer this model for this request
}

export const callAi = async (
    config: AiConfig,
    systemInstruction: string,
    userPrompt: string,
    options: CallAiOptions = {}
): Promise<{ text: string, sources?: GroundingSource[] }> => {
    const { provider, apiKey } = config;
    const { useGoogleSearch = false, responseMimeType = 'text/plain' } = options;

// Determine model override and strategy from AiConfig stageOverrides when provided by callers
const stageModel = options.modelOverride;

    switch (provider) {
        case 'gemini': {
            const ai = new GoogleGenAI({ apiKey });
            const modelName = config.model || 'gemini-2.5-flash';

            // Explicitly construct the parameters for the API call to ensure correctness.
            const params: GenerateContentParameters = {
                model: modelName,
                contents: userPrompt,
                config: {
                    systemInstruction,
                }
            };

            // Conditionally add properties to the config to avoid sending invalid combinations.
            // When using tools, responseMimeType is not allowed by the API.
            if (useGoogleSearch) {
                params.config.tools = [{ googleSearch: {} }];
            } else {
                // Only set responseMimeType when not using tools.
                if (responseMimeType === 'application/json') {
                    params.config.responseMimeType = 'application/json';
                }
                // We intentionally avoid setting responseMimeType for 'text/plain',
                // allowing the SDK to use its default. This can be more robust.
            }

            const response = await ai.models.generateContent(params);

            const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
                ?.map(c => c.web)
                .filter(s => s?.uri)
                .map(s => ({ uri: s.uri, title: s.title || '' }))
                .filter((s, i, self) => i === self.findIndex(t => t.uri === s.uri)) ?? [];
            return { text: response.text, sources };
        }
        case 'openai': {
            const client = new OpenAI({
                apiKey,
                dangerouslyAllowBrowser: true,
            });
            const modelName = options.modelOverride || config.model || 'gpt-4o';
            const messages: ChatCompletionMessageParam[] = [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userPrompt }
            ];
            const response = await client.chat.completions.create({
                model: modelName,
                messages: messages,
                ...(responseMimeType === 'application/json' && { response_format: { type: 'json_object' } })
            });
            return { text: response.choices[0].message.content || '' };
        }
        case 'openrouter': {
            const client = new OpenAI({
                apiKey,
                dangerouslyAllowBrowser: true,
                baseURL: 'https://openrouter.ai/api/v1',
                defaultHeaders: {
                    'HTTP-Referer': 'https://orchestrator.ai', // Replace with actual site
                    'X-Title': 'Orchestrator AI', // Replace with actual site
                },
            });

            const openRouterModels = (config.models && config.models.length > 0)
                ? config.models
                : [config.model || 'openai/gpt-4o']; // Fallback to single model field or default

            const messages: ChatCompletionMessageParam[] = [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userPrompt }
            ];

            const requestOptions = (responseMimeType === 'application/json')
                ? { response_format: { type: 'json_object' as const } }
                : {};

            const strategy = options.concurrencyStrategy || 'parallel';
            if (openRouterModels.length > 1 && strategy !== 'single') {
                if (strategy === 'fallback') {
                    // Try models sequentially until one succeeds
                    for (const model of openRouterModels) {
                        try {
                            const response = await client.chat.completions.create({ model, messages, ...requestOptions });
                            return { text: response.choices[0].message.content || '' };
                        } catch (e) {
                            console.warn(`Model failed (${model}). Trying next...`, e);
                        }
                    }
                    throw new Error('All OpenRouter fallback models failed.');
                } else {
                    // parallel
                    const completionPromises = openRouterModels.map(model =>
                        client.chat.completions.create({ model, messages, ...requestOptions })
                    );
                    try {
                        const firstResponse: ChatCompletion = await promiseAny(completionPromises);
                        return { text: firstResponse.choices[0].message.content || '' };
                    } catch (error) {
                        if (error instanceof CustomAggregateError) {
                            console.error("All OpenRouter models failed:", error.errors);
                            const errorMessages = error.errors.map((e: any, index: number) => {
                                const modelName = openRouterModels[index];
                                return `${modelName}: ${e.message || String(e)}`;
                            }).join('; ');
                            throw new Error(`All concurrent models failed. Errors: ${errorMessages}`);
                        }
                        throw error;
                    }
                }
            } else {
                // Single model logic or forced single
                const modelName = openRouterModels[0];
                const response = await client.chat.completions.create({ model: modelName, messages, ...requestOptions });
                return { text: response.choices[0].message.content || '' };
            }
        }
        case 'anthropic': {
            const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
            const modelName = options.modelOverride || config.model || 'claude-3-5-sonnet-20240620';
            const response = await client.messages.create({
                model: modelName,
                system: systemInstruction,
                messages: [{ role: 'user', content: userPrompt }],
                max_tokens: 4096, // Anthropic requires max_tokens
            });
            const textContent = response.content.reduce((acc, block) => {
                if ('text' in block) {
                    return acc + block.text;
                }
                return acc;
            }, '');
            return { text: textContent };
        }

        default:
            throw new Error(`Unsupported AI provider: ${provider}`);
    }
};

// Self-Correction: critique and refine outputs
export const generateSelfCorrection = async (
    aiConfig: AiConfig,
    sitewideAnalysis: SitewideAnalysis,
    seoAnalysis: SeoAnalysisResult,
    actionPlan: any
): Promise<import('../types').SelfCorrectionFeedback> => {
    return withRetry(async () => {
        const userPrompt = SELF_CORRECTION_USER_PROMPT_TEMPLATE
            .replace('${sitewideJson}', JSON.stringify(sitewideAnalysis, null, 2))
            .replace('${seoJson}', JSON.stringify(seoAnalysis, null, 2))
            .replace('${planJson}', JSON.stringify(actionPlan, null, 2));
        const { text } = await callAi(
            aiConfig,
            SELF_CORRECTION_SYSTEM_INSTRUCTION,
            userPrompt,
            { responseMimeType: 'application/json' }
        );
        const validator = (d: any) => d && typeof d.critiqueSummary === 'string' && Array.isArray(d.missedOpportunities) && Array.isArray(d.refinements) && Array.isArray(d.riskWarnings) && Array.isArray(d.modelTrace);
        return robustJsonParse(text, validator, 'SelfCorrectionFeedback');
    });
};

// SERP Deconstruction
export const generateSerpInsights = async (
    aiConfig: AiConfig,
    keyword: string
): Promise<SerpInsights> => {
    const cacheKey = `serp:${aiConfig.provider}:${keyword.trim().toLowerCase()}`;
    const run = async () => withRetry(async () => {
        const userPrompt = SERP_DECONSTRUCTION_USER_PROMPT_TEMPLATE.replace('${keyword}', keyword);
        const { text } = await callAi(
            aiConfig,
            SERP_DECONSTRUCTION_SYSTEM_INSTRUCTION,
            userPrompt,
            { useGoogleSearch: aiConfig.provider === 'gemini', responseMimeType: 'application/json',
              ...(aiConfig.stageOverrides?.serp?.model ? { modelOverride: aiConfig.stageOverrides.serp.model } : {}) }
        );
        const validate = (d: any): d is SerpInsights => d && typeof d.targetKeyword === 'string' && typeof d.serpFeatureAnalysis === 'string' && d.peopleAlsoAsk && d.relatedSearches && d.lsiKeywords;
        return robustJsonParse(text, validate, 'SerpInsights');
    });
    return await (await import('../utils/utility')).memoizeLocal(cacheKey, 1000 * 60 * 15, run)();
};

// Helper: append GSC metrics per URL into prompt context
const formatGscMetricsMap = (metrics: Record<string, any> | undefined): string => {
    if (!metrics) return '';
    const lines = Object.entries(metrics).map(([url, data]) => {
        if (!data) return `- ${url}: no_data`;
        const { clicks, impressions, ctr, position } = data as any;
        return `- ${url}: clicks=${clicks} impressions=${impressions} ctr=${ctr} position=${position}`;
    });
    return lines.length ? `\n<GSC_METRICS>\n${lines.join('\n')}\n</GSC_METRICS>\n` : '';
};



export const discoverCompetitors = async (aiConfig: AiConfig, userUrl: string): Promise<string[]> => {
    if (aiConfig.provider !== 'gemini') {
        console.warn("Competitor discovery is only available for Gemini provider.");
        return [];
    }

    const validator = (data: any): data is { sitemaps: string[] } => {
        return 'sitemaps' in data && Array.isArray(data.sitemaps) && data.sitemaps.every((s: any) => typeof s === 'string');
    };

    const userPrompt = `The user's website is: ${userUrl}`;

    const { text } = await callAi(
        aiConfig,
        COMPETITOR_DISCOVERY_SYSTEM_INSTRUCTION,
        userPrompt,
        { useGoogleSearch: true }
    );
    const result = robustJsonParse(text, validator, 'CompetitorSitemaps');
    return result.sitemaps;
};

// --- REFACTORED SERVICE FUNCTIONS ---
export const generateSitewideAudit = async (aiConfig: AiConfig, urls: string[], competitorUrls: string[], analysisType: AnalysisType, location?: string, onLog: (message: string) => void = () => {}): Promise<SitewideAnalysis> => {
    return withRetry(async () => {
       onLog('Analyzing competitor strengths...');
       const userPrompt = SITEWIDE_AUDIT_USER_PROMPT_TEMPLATE
           .replace('${USER_URL_LIST}', urls.join('\n'))
           .replace('${COMPETITOR_URL_LIST}', competitorUrls.join('\n'));
       const systemInstruction = getSitewideAuditSystemInstruction(aiConfig.provider);

       onLog(`Sending request to ${aiConfig.provider} for Sitewide Audit...`);
       const { text } = await callAi(aiConfig, systemInstruction, userPrompt, { useGoogleSearch: true });

       onLog(`Received response from ${aiConfig.provider}. Validating structure...`);
       const result = robustJsonParse(text, validateSitewideAnalysis, 'SitewideAnalysis');
       onLog('Validated sitewide audit.');
       return result;
   });
};

export const generateSeoAnalysis = async (aiConfig: AiConfig, urls: string[], analysisType: AnalysisType, location: string | undefined, strategicGoals: string[], onLog: (message: string) => void = () => {}, gscMetricsByUrl?: Record<string, any>): Promise<{ analysis: SeoAnalysisResult, sources: GroundingSource[] }> => {
    return withRetry(async () => {
        onLog('Analyzing individual page strengths and weaknesses...');
        const userPrompt = USER_PROMPT_TEMPLATE
            .replace('${URL_LIST}', urls.join('\n'))
            + formatGscMetricsMap(gscMetricsByUrl);
        const systemInstruction = getSystemInstruction(aiConfig.provider, analysisType, location, strategicGoals);

        onLog(`Sending request to ${aiConfig.provider} with Google Search grounding...`);
        const { text, sources } = await callAi(aiConfig, systemInstruction, userPrompt, { useGoogleSearch: true, ...(aiConfig.stageOverrides?.pageLevel?.model ? { modelOverride: aiConfig.stageOverrides.pageLevel.model } : {}) });

        onLog(`Received response from ${aiConfig.provider}. Extracting sources and validating structure...`);
        const analysis = robustJsonParse(text, validateSeoAnalysisResult, 'SeoAnalysisResult');
        onLog('Validated page-level analysis.');
        return { analysis, sources: sources || [] };
    });
};

export const generateExecutiveSummary = async (
    aiConfig: AiConfig,
    sitewideAnalysis: SitewideAnalysis,
    seoAnalysis: SeoAnalysisResult
): Promise<ExecutiveSummary> => {
    return withRetry(async () => {
        const fullAnalysisData = {
            sitewideAnalysis,
            seoAnalysis
        };

        const userPrompt = EXECUTIVE_SUMMARY_USER_PROMPT_TEMPLATE
            .replace('${analysisJson}', JSON.stringify(fullAnalysisData, null, 2));

        const { text } = await callAi(
            aiConfig,
            EXECUTIVE_SUMMARY_SYSTEM_INSTRUCTION,
            userPrompt,
            { responseMimeType: 'application/json' }
        );

        return robustJsonParse(text, validateExecutiveSummary, 'ExecutiveSummary');
    });
};
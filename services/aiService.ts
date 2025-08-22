


import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import type { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import Anthropic from '@anthropic-ai/sdk';
import { getSystemInstruction, USER_PROMPT_TEMPLATE, getSitewideAuditSystemInstruction, SITEWIDE_AUDIT_USER_PROMPT_TEMPLATE, COMPETITOR_DISCOVERY_SYSTEM_INSTRUCTION, EXECUTIVE_SUMMARY_SYSTEM_INSTRUCTION, EXECUTIVE_SUMMARY_USER_PROMPT_TEMPLATE, PERFORMANCE_DIAGNOSIS_SYSTEM_INSTRUCTION, SNIPPET_OPPORTUNITY_SYSTEM_INSTRUCTION, SERP_INSIGHTS_SYSTEM_INSTRUCTION, POST_IMPLEMENTATION_VERDICT_SYSTEM_INSTRUCTION, ARTICLE_DRAFT_SYSTEM_INSTRUCTION, SERP_COMPARISON_SYSTEM_INSTRUCTION } from '../constants';
import type { SeoAnalysisResult, GroundingSource, AnalysisType, SitewideAnalysis, AiConfig, ExecutiveSummary, GenerateContentParameters, PagePerformance, GscPerformanceData, SnippetOpportunity, SerpInsights, PostImplementationReport, KeywordIdea } from "../types";
import { withRetry, promiseAny, CustomAggregateError, robustJsonParse } from "../utils/utility";

// --- AI HARDENING: RETRY LOGIC & ROBUST PARSING ---

const validateSeoAnalysisResult = (data: any): data is SeoAnalysisResult => {
    return data && typeof data === 'object' && 'pageActions' in data && 'keywords' in data && Array.isArray(data.pageActions) && Array.isArray(data.keywords);
}

const validateSitewideAnalysis = (data: any): data is SitewideAnalysis => (
    data && typeof data === 'object' &&
    'strategicRoadmap' in data &&
    'technicalHealth' in data &&
    'contentGaps' in data &&
    'topicClusters' in data &&
    'siteArchitectureGraph' in data &&
    'localBusinessAudit' in data &&
    'zeroToOneInitiatives' in data &&
    'internalLinkingAnalysis' in data &&
    'cannibalizationAnalysis' in data &&
    Array.isArray(data.contentGaps) &&
    Array.isArray(data.topicClusters) &&
    Array.isArray(data.zeroToOneInitiatives) &&
    data.strategicRoadmap && typeof data.strategicRoadmap.projectedImpactScore === 'number'
);

const validateExecutiveSummary = (data: any): data is ExecutiveSummary => {
  return (
    data && typeof data === 'object' &&
    'summaryTitle' in data && typeof data.summaryTitle === 'string' &&
    'summaryIntroduction' in data && typeof data.summaryIntroduction === 'string' &&
    'rewrites' in data && Array.isArray(data.rewrites) &&
    'optimizations' in data && Array.isArray(data.optimizations) &&
    'newContent' in data && Array.isArray(data.newContent) &&
    'redirects' in data && Array.isArray(data.redirects) &&
    'contentDecay' in data && Array.isArray(data.contentDecay)
  );
};

const validatePagePerformance = (data: any): data is PagePerformance => {
    return (
        data && typeof data === 'object' &&
        typeof data.summary === 'string' &&
        Array.isArray(data.recommendations) &&
        typeof data.metrics === 'object' &&
        typeof data.metrics.clicks === 'number'
    );
};

const validateSnippetOpportunity = (data: any): data is SnippetOpportunity => {
    return (
        data && typeof data === 'object' &&
        typeof data.opportunityFound === 'boolean' &&
        typeof data.opportunityType === 'string' &&
        typeof data.reasoning === 'string' &&
        typeof data.jsonLdSchema === 'object'
    );
};

const validateSerpInsights = (data: any): data is SerpInsights => {
    return (
        data && typeof data === 'object' &&
        typeof data.targetKeyword === 'string' &&
        typeof data.aiOverview === 'string' &&
        Array.isArray(data.peopleAlsoAsk) &&
        Array.isArray(data.relatedSearches) &&
        typeof data.lsiKeywords === 'object'
    );
};

const validatePostImplementationReport = (data: any): data is PostImplementationReport => {
    return (
        data && typeof data === 'object' &&
        typeof data.verdict === 'string' &&
        typeof data.nextStepsSummary === 'string' &&
        typeof data.before === 'object' &&
        typeof data.after === 'object'
    );
};


// --- UNIVERSAL AI CALL FUNCTION ---
interface CallAiOptions {
    useGoogleSearch?: boolean;
    responseMimeType?: 'application/json' | 'text/plain';
    maxTokens?: number;
}

export const callAi = async (
    config: AiConfig,
    systemInstruction: string,
    userPrompt: string,
    options: CallAiOptions = {}
): Promise<{ text: string, sources?: GroundingSource[] }> => {
    const { provider, apiKey } = config;
    const { useGoogleSearch = false, responseMimeType = 'text/plain', maxTokens } = options;

    switch (provider) {
        case 'gemini': {
            const ai = new GoogleGenAI({ apiKey });
            const modelName = config.model || 'gemini-2.5-flash';
            
            const params: GenerateContentParameters = {
                model: modelName,
                contents: userPrompt,
                config: {
                    systemInstruction,
                }
            };

            if (useGoogleSearch) {
                params.config.tools = [{ googleSearch: {} }];
            } else if (responseMimeType === 'application/json') {
                params.config.responseMimeType = 'application/json';
            }

            if (maxTokens) {
                params.config.maxOutputTokens = maxTokens;
                if (modelName === 'gemini-2.5-flash') {
                    // Reserve half of the tokens for the final output, the rest for thinking.
                    params.config.thinkingConfig = { thinkingBudget: Math.floor(maxTokens / 2) };
                }
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
            const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
            const modelName = config.model || 'gpt-4o';
            const messages: ChatCompletionMessageParam[] = [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userPrompt }
            ];
            const response = await client.chat.completions.create({
                model: modelName,
                messages: messages,
                ...(responseMimeType === 'application/json' && { response_format: { type: 'json_object' } }),
                ...(maxTokens && { max_tokens: maxTokens })
            });
            return { text: response.choices[0].message.content || '' };
        }
        case 'openrouter': {
            const client = new OpenAI({
                apiKey,
                dangerouslyAllowBrowser: true,
                baseURL: 'https://corsproxy.io/?' + encodeURIComponent('https://openrouter.ai/api/v1'),
                defaultHeaders: {
                    'HTTP-Referer': 'https://orchestrator.ai',
                    'X-Title': 'Orchestrator AI',
                },
            });
            
            const openRouterModels = (config.models && config.models.length > 0)
                ? config.models
                : [config.model || 'openai/gpt-4o'];

            const messages: ChatCompletionMessageParam[] = [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: userPrompt }
            ];
            
            const requestOptions: { 
                response_format?: { type: 'json_object' },
                max_tokens?: number
            } = (responseMimeType === 'application/json') 
                ? { response_format: { type: 'json_object' as const } } 
                : {};
            if (maxTokens) {
                requestOptions.max_tokens = maxTokens;
            }

            if (openRouterModels.length > 1) {
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
            } else {
                const modelName = openRouterModels[0];
                const response = await client.chat.completions.create({ model: modelName, messages, ...requestOptions });
                return { text: response.choices[0].message.content || '' };
            }
        }
        case 'anthropic': {
            const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
            const modelName = config.model || 'claude-3-5-sonnet-20240620';
            const response = await client.messages.create({
                model: modelName,
                system: systemInstruction,
                messages: [{ role: 'user', content: userPrompt }],
                max_tokens: maxTokens || 4096,
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

export const discoverCompetitors = async (aiConfig: AiConfig, userUrl: string): Promise<string[]> => {
    if (aiConfig.provider !== 'gemini') {
        console.warn("Competitor discovery is only available for Gemini provider.");
        return [];
    }

    const validator = (data: any): data is { sitemaps: string[] } => {
        return data && 'sitemaps' in data && Array.isArray(data.sitemaps) && data.sitemaps.every((s: any) => typeof s === 'string');
    };
    
    const userPrompt = `The user's website is: ${userUrl}`;

    const { text } = await callAi(
        aiConfig,
        COMPETITOR_DISCOVERY_SYSTEM_INSTRUCTION,
        userPrompt,
        { useGoogleSearch: true, responseMimeType: 'application/json' }
    );
    const result = robustJsonParse(text, validator, 'CompetitorSitemaps');
    return result.sitemaps;
};

export const generateSitewideAudit = async (aiConfig: AiConfig, urls: string[], competitorUrls: string[], analysisType: AnalysisType, location?: string, onLog: (message: string) => void = () => {}): Promise<SitewideAnalysis> => {
    return withRetry(async () => {
       onLog('Analyzing competitor strengths...');
       const userPrompt = SITEWIDE_AUDIT_USER_PROMPT_TEMPLATE
           .replace('${USER_URL_LIST}', urls.join('\n'))
           .replace('${COMPETITOR_URL_LIST}', competitorUrls.join('\n'));
       const systemInstruction = getSitewideAuditSystemInstruction(aiConfig.provider, analysisType, location);
       
       onLog(`Sending request to ${aiConfig.provider} for Sitewide Audit...`);
       const { text } = await callAi(aiConfig, systemInstruction, userPrompt, { useGoogleSearch: true, responseMimeType: 'application/json' });
       
       onLog(`Received response from ${aiConfig.provider}. Validating structure...`);
       const result = robustJsonParse(text, validateSitewideAnalysis, 'SitewideAnalysis');
       onLog('Validated sitewide audit.');
       return result;
   });
};

export const generateSeoAnalysis = async (aiConfig: AiConfig, urls: string[], analysisType: AnalysisType, location: string | undefined, strategicGoals: string[], onLog: (message: string) => void = () => {}): Promise<{ analysis: SeoAnalysisResult, sources: GroundingSource[] }> => {
    return withRetry(async () => {
        onLog('Analyzing individual page strengths and weaknesses...');
        const userPrompt = USER_PROMPT_TEMPLATE
            .replace('${URL_LIST}', urls.join('\n'));
        const systemInstruction = getSystemInstruction(aiConfig.provider, analysisType, location, strategicGoals);
        
        onLog(`Sending request to ${aiConfig.provider} with Google Search grounding...`);
        const { text, sources } = await callAi(aiConfig, systemInstruction, userPrompt, { useGoogleSearch: true, responseMimeType: 'application/json' });
        
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

// --- HYPER-PRECISION ON-DEMAND SERVICES ---

export const diagnosePagePerformance = async (aiConfig: AiConfig, url: string, gscData: GscPerformanceData): Promise<PagePerformance> => {
    return withRetry(async () => {
        const userPrompt = `Diagnose the performance for the URL: ${url}\n\nGSC Data:\n${JSON.stringify(gscData, null, 2)}`;
        const { text } = await callAi(
            aiConfig,
            PERFORMANCE_DIAGNOSIS_SYSTEM_INSTRUCTION,
            userPrompt,
            { responseMimeType: 'application/json' }
        );
        return robustJsonParse(text, validatePagePerformance, `PagePerformance for ${url}`);
    });
};

export const generateSnippetOpportunity = async (aiConfig: AiConfig, url: string): Promise<SnippetOpportunity> => {
    if (aiConfig.provider !== 'gemini') {
        throw new Error("Snippet Opportunity analysis requires the Gemini provider for live Google Search.");
    }
    return withRetry(async () => {
        const userPrompt = `Analyze the content of this URL for snippet opportunities: ${url}`;
        const { text } = await callAi(
            aiConfig,
            SNIPPET_OPPORTUNITY_SYSTEM_INSTRUCTION,
            userPrompt,
            { useGoogleSearch: true, responseMimeType: 'application/json' }
        );
        return robustJsonParse(text, validateSnippetOpportunity, `SnippetOpportunity for ${url}`);
    });
};

export const generateSerpInsights = async (aiConfig: AiConfig, keyword: string): Promise<SerpInsights> => {
    if (aiConfig.provider !== 'gemini') {
        throw new Error("SERP Insights analysis requires the Gemini provider for live Google Search.");
    }
    return withRetry(async () => {
        const userPrompt = `Generate SERP insights for the keyword: "${keyword}"`;
        const { text } = await callAi(
            aiConfig,
            SERP_INSIGHTS_SYSTEM_INSTRUCTION,
            userPrompt,
            { useGoogleSearch: true, responseMimeType: 'application/json' }
        );
        return robustJsonParse(text, validateSerpInsights, `SerpInsights for "${keyword}"`);
    });
};

export const generateSerpComparison = async (aiConfig: AiConfig, baseline: SerpInsights, latest: SerpInsights): Promise<string> => {
    return withRetry(async () => {
        const userPrompt = `Analyze the difference between the two SERP snapshots provided.\n\nBaseline Snapshot:\n${JSON.stringify(baseline, null, 2)}\n\nLatest Snapshot:\n${JSON.stringify(latest, null, 2)}`;
        const { text } = await callAi(
            aiConfig,
            SERP_COMPARISON_SYSTEM_INSTRUCTION,
            userPrompt,
            { responseMimeType: 'text/plain' }
        );
        if (!text || text.trim().length === 0) {
            throw new Error("SERP comparison AI returned an empty response.");
        }
        return text.trim();
    });
};

export const generatePostImplementationVerdict = async (aiConfig: AiConfig, before: GscPerformanceData, after: GscPerformanceData): Promise<PostImplementationReport> => {
    return withRetry(async () => {
        const userPrompt = `Before data: ${JSON.stringify(before)}\n\nAfter data: ${JSON.stringify(after)}`;
        const { text } = await callAi(
            aiConfig,
            POST_IMPLEMENTATION_VERDICT_SYSTEM_INSTRUCTION,
            userPrompt,
            { responseMimeType: 'application/json' }
        );
        // The AI will return the full object, but we only need to validate it.
        // The 'before' and 'after' data will be passed through.
        return robustJsonParse(text, validatePostImplementationReport, `PostImplementationReport`);
    });
};

export const generateArticleDraft = async (aiConfig: AiConfig, keywordIdea: KeywordIdea): Promise<string> => {
    return withRetry(async () => {
        const userPrompt = `Generate an article based on this brief:\n\n${JSON.stringify(keywordIdea, null, 2)}`;
        const { text } = await callAi(
            aiConfig,
            ARTICLE_DRAFT_SYSTEM_INSTRUCTION,
            userPrompt
        );
        // This call expects raw markdown, so no JSON parsing is needed.
        return text;
    });
};
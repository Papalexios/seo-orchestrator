
import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { AiConfig } from '../types';
import { withRetry, promiseAny, CustomAggregateError } from '../utils/utility';

interface ValidationResult {
    success: boolean;
    message?: string;
}

const getErrorMessage = (error: any): string => {
    const status = error?.status || error?.response?.status;
    const message = error?.message || error?.error?.message;
    const lowerMessage = message?.toLowerCase() || '';

    if (error instanceof CustomAggregateError) {
        return "All configured models failed validation. Please check each model name and your API key.";
    }

    if (status === 401 || lowerMessage.includes("invalid api key")) return "Authentication failed. The API key is incorrect, expired, or not authorized for the requested model.";
    if (status === 403) return "Permission denied. Please check your project/organization permissions.";
    if (status === 429) return "Rate limit exceeded. Please wait a moment or check your plan.";
    
    if (lowerMessage.includes('insufficient_quota') || lowerMessage.includes('quota')) return "Your account has insufficient quota. Please check your billing.";
    if (lowerMessage.includes('model_not_found')) return `The specified model was not found. Please check the model name.`;
    if (lowerMessage.includes('api key not valid')) return 'The provided API Key is not valid. Please check and try again.';

    if (error instanceof Error && error.name === 'AbortError') return "Request timed out. Please check your network connection.";
    
    if (message) return message.split('\n')[0];

    return 'An unknown validation error occurred.';
}

export const validateApiKey = async (config: AiConfig): Promise<ValidationResult> => {
    const { provider, apiKey, model, models } = config;
    if (!apiKey) {
        return { success: false, message: 'API Key cannot be empty.' };
    }

    const validationAttempt = async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for each attempt

        try {
            switch(provider) {
                case 'gemini': {
                    const ai = new GoogleGenAI({ apiKey });
                    const geminiPromise = ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: 'test',
                    });

                    const abortPromise = new Promise<never>((_, reject) => {
                        if (controller.signal.aborted) {
                            reject(new DOMException('Validation timed out', 'AbortError'));
                        }
                        controller.signal.addEventListener('abort', () => {
                            reject(new DOMException('Validation timed out', 'AbortError'));
                        });
                    });

                    await Promise.race([geminiPromise, abortPromise]);
                    break;
                }
                case 'openai': {
                    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
                    await client.models.list({ signal: controller.signal });
                    break;
                }
                case 'anthropic': {
                    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
                    await client.messages.create({
                        model: 'claude-3-haiku-20240307',
                        messages: [{ role: 'user', content: 'test' }],
                        max_tokens: 1
                    }, { signal: controller.signal });
                    break;
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
                    const validationModels = (models && models.length > 0)
                        ? models
                        : [model || 'mistralai/mistral-7b-instruct'];
                    
                    const validationPromises = validationModels.map(m =>
                        client.chat.completions.create({
                            model: m,
                            messages: [{ role: 'user', content: 'test' }],
                            max_tokens: 1
                        }, { signal: controller.signal })
                    );
                    
                    await promiseAny(validationPromises);
                    break;
                }
                default:
                    throw new Error('Unsupported AI provider.');
            }
        } finally {
            clearTimeout(timeoutId);
        }
    };

    try {
        await validationAttempt();
        return { success: true };
    } catch(e) {
        return { success: false, message: getErrorMessage(e) };
    }
};

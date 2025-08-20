import type { AiConfig } from '../types';

interface ValidationResult {
    success: boolean;
    message?: string;
}

const PROXY_URL = 'https://corsproxy.io/?';
const TIMEOUT = 15000; // 15 seconds

/**
 * A robust, proxied fetcher for API validation. It directly checks HTTP status codes.
 */
async function performValidationRequest(
    url: string,
    options: RequestInit
): Promise<{ response: Response; body: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
        const proxiedUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
        const response = await fetch(proxiedUrl, {
            ...options,
            signal: controller.signal,
        });

        // Try to parse body regardless of status, as it might contain error details.
        const body = await response.json().catch(() => response.text());

        return { response, body };
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timed out after ${TIMEOUT / 1000} seconds. The service might be down or your network connection is unstable.`);
        }
        // This catches network errors, like if the proxy is down.
        throw new Error(`Network request failed. This could be a CORS issue or a problem with your connection. Please check your network and try again. Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        clearTimeout(timeoutId);
    }
}

async function validateGemini(apiKey: string): Promise<ValidationResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "test" }] }] }),
    };

    try {
        const { response, body } = await performValidationRequest(url, options);

        if (response.ok) {
            return { success: true };
        }

        // Gemini returns 400 for invalid keys
        if (response.status === 400 && body?.error?.message?.includes('API key not valid')) {
            return { success: false, message: 'Invalid API Key. Please check the key and try again.' };
        }
        
        if (response.status === 403) {
             return { success: false, message: `Permission Denied: ${body?.error?.message || 'Check API permissions in your Google Cloud project.'}` };
        }

        if (response.status === 429) {
            return { success: false, message: 'Quota exceeded. Please check your billing or usage limits.' };
        }

        return { success: false, message: `Validation failed. Status: ${response.status}. Message: ${body?.error?.message || 'Unknown error.'}` };

    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
}

async function validateOpenAI(apiKey: string): Promise<ValidationResult> {
    const url = 'https://api.openai.com/v1/models'; // Using a simple GET endpoint is sufficient and cheaper
    const options = {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` },
    };
    
    try {
        const { response, body } = await performValidationRequest(url, options);

        if (response.ok) {
            return { success: true };
        }

        if (response.status === 401) {
            return { success: false, message: `Authentication failed. The API key is incorrect or expired. (${body?.error?.code || ''})` };
        }
        
        if (response.status === 429) {
            return { success: false, message: `Rate limit or quota exceeded. Please check your OpenAI account. (${body?.error?.code || ''})` };
        }

        return { success: false, message: `Validation failed. Status: ${response.status}. Message: ${body?.error?.message || 'Unknown error.'}` };

    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
}


async function validateAnthropic(apiKey: string): Promise<ValidationResult> {
    const url = 'https://api.anthropic.com/v1/messages';
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
        }),
    };
    
    try {
        const { response, body } = await performValidationRequest(url, options);

        if (response.ok) {
            return { success: true };
        }

        if (response.status === 401) {
            return { success: false, message: `Authentication failed. The API key is incorrect. (${body?.error?.type || ''})` };
        }
        
        if (response.status === 403) {
            return { success: false, message: `Permission Denied. The API key may be disabled. (${body?.error?.type || ''})` };
        }

        if (response.status === 429) {
            return { success: false, message: `Rate limit exceeded. Please check your Anthropic account. (${body?.error?.type || ''})` };
        }

        return { success: false, message: `Validation failed. Status: ${response.status}. Message: ${body?.error?.message || 'Unknown error.'}` };

    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
}


async function validateOpenRouter(apiKey: string, models: string[] = []): Promise<ValidationResult> {
    const url = 'https://openrouter.ai/api/v1/chat/completions';
    // Use a very cheap/free model for validation if none are provided
    const modelToTest = models.length > 0 ? models[0] : 'mistralai/mistral-7b-instruct:free';
    
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://orchestrator.ai',
            'X-Title': 'Orchestrator AI',
        },
        body: JSON.stringify({
            model: modelToTest,
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1
        }),
    };

    try {
        const { response, body } = await performValidationRequest(url, options);
        
        if (response.ok) {
            return { success: true };
        }

        if (response.status === 401) {
            return { success: false, message: `Authentication failed. The API key is incorrect. (${body?.error?.code || ''})` };
        }
        
        if (response.status === 402) {
             return { success: false, message: `Payment Required. You may be out of credits on OpenRouter. (${body?.error?.code || ''})` };
        }

        if (response.status === 429) {
            return { success: false, message: `Rate limit exceeded. Please check your OpenRouter account. (${body?.error?.code || ''})` };
        }

        return { success: false, message: `Validation failed. Status: ${response.status}. Message: ${body?.error?.message || 'Unknown error.'}` };
        
    } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
}


export const validateApiKey = async (config: AiConfig): Promise<ValidationResult> => {
    const { provider, apiKey, models } = config;
    if (!apiKey || apiKey.trim() === '') {
        return { success: false, message: 'API Key cannot be empty.' };
    }

    switch(provider) {
        case 'gemini':
            return validateGemini(apiKey);
        case 'openai':
            return validateOpenAI(apiKey);
        case 'anthropic':
            return validateAnthropic(apiKey);
        case 'openrouter':
            return validateOpenRouter(apiKey, models);
        default:
            return { success: false, message: 'Unsupported AI provider selected for validation.' };
    }
};

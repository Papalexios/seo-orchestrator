
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-')     // Replace multiple - with single -
    .replace(/^-+/, '')         // Trim - from start of text
    .replace(/-+$/, '');        // Trim - from end of text
};

export const delay = (ms: number): Promise<void> => new Promise(res => setTimeout(res, ms));


/**
 * Executes a collection of async tasks with a limited concurrency.
 * @param items The array of items to process.
 * @param taskFn The async function to execute for each item.
 * @param concurrency The maximum number of tasks to run at the same time.
 * @param onProgress Optional callback for progress updates.
 * @returns A promise that resolves with an array of PromiseSettledResult objects, preserving order.
 */
export const executeConcurrent = async <T, R>(
    items: T[],
    taskFn: (item: T, index: number) => Promise<R>,
    concurrency: number,
    onProgress?: (progress: { completed: number, total: number }) => void
): Promise<PromiseSettledResult<R>[]> => {
    const results: PromiseSettledResult<R>[] = new Array(items.length);
    const queue = [...items.map((item, index) => ({ item, index }))];
    let completedCount = 0;
    const total = items.length;

    const worker = async () => {
        while (queue.length > 0) {
            const task = queue.shift();
            if (!task) continue;

            try {
                const result = await taskFn(task.item, task.index);
                results[task.index] = { status: 'fulfilled', value: result };
            } catch (error) {
                console.error(`Task failed for item at index ${task.index}:`, error);
                results[task.index] = { status: 'rejected', reason: error };
            } finally {
                completedCount++;
                if (onProgress) {
                    onProgress({ completed: completedCount, total });
                }
            }
        }
    };

    const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
    await Promise.all(workers);

    return results;
};


export const isRateLimitError = (error: any): boolean => {
    const errorMessage = (error?.message || JSON.stringify(error)).toLowerCase();
    return errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('rate limit');
};

export const withRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
    let lastError: any;
    const maxRetries = 5;
    const initialDelay = 2000; // 2 seconds

    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await fn();
            decayRatePenalty();
            return result;
        } catch (error) {
            lastError = error;
            if (isRateLimitError(error)) {
                noteRateLimit();
                if (i < maxRetries - 1) {
                    const delay = initialDelay * Math.pow(2, i) + (Math.random() * 1000);
                    console.warn(
                        `Rate limit exceeded. Retrying in ${Math.round(delay / 1000)}s... (Attempt ${i + 2}/${maxRetries})`
                    );
                    await new Promise(res => setTimeout(res, delay));
                }
            } else {
                console.error("Encountered non-retriable error:", error);
                throw error;
            }
        }
    }

    console.error("Failed to execute function after multiple rate limit retries.", lastError);
    throw lastError;
};

// Custom AggregateError-like class for environments that don't have it.
export class CustomAggregateError extends Error {
    errors: any[];
    constructor(errors: any[], message = 'All promises were rejected') {
        super(message);
        this.name = 'CustomAggregateError';
        this.errors = errors;
    }
}

/**
 * A simple polyfill for Promise.any for environments that may not support it.
 * @param promises An array of promises.
 * @returns A promise that fulfills with the value of the first promise to fulfill, or rejects with a CustomAggregateError.
 */
export const promiseAny = <T>(promises: (Promise<T>|PromiseLike<T>)[]): Promise<T> => {
    return new Promise((resolve, reject) => {
        if (!promises || promises.length === 0) {
            reject(new CustomAggregateError([], "No promises provided."));
            return;
        }

        let rejectedCount = 0;
        const errors: any[] = [];

        promises.forEach(promise => {
            Promise.resolve(promise)
                .then(resolve)
                .catch(error => {
                    rejectedCount++;
                    errors.push(error);
                    if (rejectedCount === promises.length) {
                        reject(new CustomAggregateError(errors));
                    }
                });
        });
    });
};

export const memoizeLocal = <T>(key: string, ttlMs: number, fn: () => Promise<T>) => {
  return async (): Promise<T> => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const { v, t } = JSON.parse(raw);
        if (Date.now() - t < ttlMs) return v as T;
      }
    } catch {}
    const value = await fn();
    try { localStorage.setItem(key, JSON.stringify({ v: value, t: Date.now() })); } catch {}
    return value;
  };
};

export const getAdaptiveConcurrency = (provider: string, strategy?: 'parallel' | 'fallback' | 'single'): number => {
  const penalty = getRatePenalty();
  const reduce = (n: number) => Math.max(1, n - Math.ceil(penalty / 2));
  // Conservative defaults tuned for client-side APIs, reduced by penalty
  if (provider === 'openrouter') {
    if (strategy === 'parallel') return reduce(8);
    if (strategy === 'fallback') return reduce(4);
    return reduce(5);
  }
  if (provider === 'gemini') return reduce(6);
  if (provider === 'openai') return reduce(5);
  if (provider === 'anthropic') return reduce(4);
  return reduce(5);
};

export const getAdaptiveChunkSize = (totalUrls: number): number => {
  if (totalUrls > 1000) return 40;
  if (totalUrls > 500) return 30;
  if (totalUrls > 200) return 25;
  return 20;
};

// Rate limit penalty tracker (simple, in-memory)
let ratePenalty = 0; // increases on 429s, decays over time
export const noteRateLimit = () => { ratePenalty = Math.min(ratePenalty + 1, 10); };
export const decayRatePenalty = () => { ratePenalty = Math.max(ratePenalty - 1, 0); };
export const getRatePenalty = () => ratePenalty;




export const extractJsonFromString = (text: string): string | null => {
    const markdownMatch = text.match(/```(json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[2]) {
        try {
            const potentialJson = markdownMatch[2].trim();
            JSON.parse(potentialJson);
            return potentialJson;
        } catch (e) { /* Ignore parsing error here, try the next method */ }
    }
    let braceCount = 0;
    let startIndex = -1;
    let inString = false;
    let firstBrace = text.indexOf('{');
    let firstBracket = text.indexOf('[');

    let startChar = '{';
    let endChar = '}';
    let startIndexToUse = firstBrace;

    if (firstBracket !== -1 && (firstBracket < firstBrace || firstBrace === -1)) {
        startChar = '[';
        endChar = ']';
        startIndexToUse = firstBracket;
    }

    if (startIndexToUse === -1) return null;

    for (let i = startIndexToUse; i < text.length; i++) {
        if (text[i] === '"' && text[i-1] !== '\\') {
            inString = !inString;
        }
        if (inString) continue;

        if (text[i] === startChar) {
            if (braceCount === 0) startIndex = i;
            braceCount++;
        } else if (text[i] === endChar) {
            if (startIndex === -1) continue;
            braceCount--;
            if (braceCount === 0) {
                const potentialJson = text.substring(startIndex, i + 1);
                try {
                    JSON.parse(potentialJson);
                    return potentialJson;
                } catch (e) { startIndex = -1; }
            }
        }
    }
    return null;
};

export const robustJsonParse = <T>(text: string, validator: (data: any) => data is T, context: string): T => {
    if (!text || typeof text !== 'string' || text.trim() === '') {
        throw new Error(`The AI returned an empty or invalid response for ${context}.`);
    }

    const jsonString = extractJsonFromString(text);

    if (jsonString) {
        try {
            const data = JSON.parse(jsonString);

            // First attempt: Validate the data as is.
            if (validator(data)) {
                return data;
            }

            // Second attempt (AI Hardening): If validation fails, and the data is an object,
            // check if any of its properties contain the valid structure. This handles cases
            // where the AI wraps the response in a root object, e.g., { "actionPlan": [...] }.
            if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
                for (const key in data) {
                    if (Object.prototype.hasOwnProperty.call(data, key)) {
                        const potentialData = data[key];
                        if (validator(potentialData)) {
                            console.warn(`Resilient parsing: Found valid data under key "${key}" for context "${context}".`);
                            return potentialData as T;
                        }
                    }
                }
            }

            // If both attempts fail, throw the structure error.
            throw new Error(`The AI returned a JSON object with a missing or incorrect structure for ${context}.`);

        } catch (e) {
             const errorMessage = e instanceof Error ? e.message : String(e);
             throw new Error(`The AI returned a malformed JSON object that could not be parsed. Error: ${errorMessage}`);
        }
    }

    const commonErrors = ["i apologize", "cannot", "api key not valid", "rate limit"];
    const lowerCaseText = text.toLowerCase();
    if (commonErrors.some(err => lowerCaseText.includes(err))) {
         throw new Error(`The AI returned a blocking error: "${text.slice(0, 100)}..."`);
    }

    throw new Error(`Could not find a valid JSON object in the AI's response. The response started with: "${text.slice(0, 100)}..."`);
}
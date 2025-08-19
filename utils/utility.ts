

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


export class JsonParsingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'JsonParsingError';
    }
}

export const isRateLimitError = (error: any): boolean => {
    const errorMessage = (error?.message || JSON.stringify(error)).toLowerCase();
    const status = error?.status || error?.response?.status;
    return status === 429 || errorMessage.includes('rate limit') || errorMessage.includes('resource_exhausted') || errorMessage.includes('quota');
};

const isTransientError = (error: any): boolean => {
    if (isRateLimitError(error)) {
        return true;
    }
    if (error instanceof JsonParsingError) {
        return true;
    }
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
        return true;
    }
    return false;
};

export const withRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
    let lastError: any;
    const maxRetries = 5;
    const initialDelay = 2000; // 2 seconds

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (isTransientError(error)) {
                if (i < maxRetries - 1) {
                    const delay = initialDelay * Math.pow(2, i) + (Math.random() * 1000);
                    console.warn(
                        `Transient error detected: ${error.message}. Retrying in ${Math.round(delay / 1000)}s... (Attempt ${i + 2}/${maxRetries})`
                    );
                    await new Promise(res => setTimeout(res, delay));
                }
            } else {
                console.error("Encountered non-retriable error:", error);
                throw error;
            }
        }
    }
    
    console.error("Failed to execute function after multiple retries.", lastError);
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
        let hasResolved = false;

        promises.forEach(promise => {
            Promise.resolve(promise)
                .then(value => {
                    if (!hasResolved) {
                        hasResolved = true;
                        resolve(value);
                    }
                })
                .catch(error => {
                    if (!hasResolved) {
                        rejectedCount++;
                        errors.push(error);
                        if (rejectedCount === promises.length) {
                            reject(new CustomAggregateError(errors));
                        }
                    }
                });
        });
    });
};

export const extractJsonFromString = (text: string): string | null => {
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
        try {
            const potentialJson = markdownMatch[1].trim();
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
                } catch (e) { 
                    // This might be a false positive, so reset start index and continue scanning.
                    startIndex = -1;
                    braceCount = 0;
                 }
            }
        }
    }
    return null;
};

export const robustJsonParse = <T>(text: string, validator: (data: any) => data is T, context: string): T => {
    if (!text || typeof text !== 'string' || text.trim() === '') {
        throw new JsonParsingError(`The AI returned an empty or invalid response for ${context}.`);
    }

    const jsonString = extractJsonFromString(text);

    if (jsonString) {
        try {
            const data = JSON.parse(jsonString);

            if (validator(data)) {
                return data;
            }

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

            throw new JsonParsingError(`The AI returned a JSON object with a missing or incorrect structure for ${context}.`);
            
        } catch (e) {
             const errorMessage = e instanceof Error ? e.message : String(e);
             throw new JsonParsingError(`The AI returned a malformed JSON object that could not be parsed for ${context}. Error: ${errorMessage}`);
        }
    }

    const commonErrors = ["i apologize", "cannot", "api key not valid", "rate limit"];
    const lowerCaseText = text.toLowerCase();
    if (commonErrors.some(err => lowerCaseText.includes(err))) {
         throw new JsonParsingError(`The AI returned a blocking error for ${context}: "${text.slice(0, 100)}..."`);
    }

    throw new JsonParsingError(`Could not find a valid JSON object in the AI's response for ${context}. The response started with: "${text.slice(0, 100)}..."`);
}
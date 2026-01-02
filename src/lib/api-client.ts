/**
 * API Client with retry logic and error handling
 * Provides resilient HTTP fetching with exponential backoff
 */

interface FetchOptions extends RequestInit {
    retries?: number;
    retryDelay?: number;
    timeout?: number;
}

interface ApiClientConfig {
    baseRetries: number;
    baseDelay: number;
    maxDelay: number;
    timeout: number;
}

const defaultConfig: ApiClientConfig = {
    baseRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    timeout: 15000,
};

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
        public readonly code?: string,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay with jitter
 */
const getBackoffDelay = (attempt: number, baseDelay: number, maxDelay: number): number => {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
    return Math.min(exponentialDelay + jitter, maxDelay);
};

/**
 * Determine if an error is retryable
 */
const isRetryableError = (status?: number): boolean => {
    if (!status) return true; // Network errors are retryable
    // Retry on 5xx errors and 429 (rate limit)
    return status >= 500 || status === 429;
};

/**
 * Fetch with retry logic and exponential backoff
 */
export async function fetchWithRetry<T>(
    url: string,
    options: FetchOptions = {},
    config: Partial<ApiClientConfig> = {}
): Promise<T> {
    const {
        baseRetries = defaultConfig.baseRetries,
        baseDelay = defaultConfig.baseDelay,
        maxDelay = defaultConfig.maxDelay,
        timeout = defaultConfig.timeout,
    } = config;

    const { retries = baseRetries, ...fetchOptions } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const retryable = isRetryableError(response.status);
                throw new ApiError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status,
                    'HTTP_ERROR',
                    retryable
                );
            }

            return await response.json() as T;
        } catch (error) {
            lastError = error as Error;

            // Check if we should retry
            const isApiError = error instanceof ApiError;
            const shouldRetry = attempt < retries && (
                !isApiError ||
                (isApiError && error.retryable)
            );

            if (shouldRetry) {
                const delay = getBackoffDelay(attempt, baseDelay, maxDelay);
                console.warn(
                    `[fetchWithRetry] Attempt ${attempt + 1}/${retries + 1} failed for ${url}. ` +
                    `Retrying in ${Math.round(delay)}ms...`
                );
                await sleep(delay);
            }
        }
    }

    throw lastError || new ApiError('Unknown error', undefined, 'UNKNOWN_ERROR');
}

/**
 * Fetch binary data (e.g., for protobuf) with retry logic
 */
export async function fetchBinaryWithRetry(
    url: string,
    options: FetchOptions = {},
    config: Partial<ApiClientConfig> = {}
): Promise<ArrayBuffer> {
    const {
        baseRetries = defaultConfig.baseRetries,
        baseDelay = defaultConfig.baseDelay,
        maxDelay = defaultConfig.maxDelay,
        timeout = defaultConfig.timeout,
    } = config;

    const { retries = baseRetries, ...fetchOptions } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new ApiError(
                    `HTTP ${response.status}`,
                    response.status,
                    'HTTP_ERROR',
                    isRetryableError(response.status)
                );
            }

            return await response.arrayBuffer();
        } catch (error) {
            lastError = error as Error;
            const isApiError = error instanceof ApiError;
            const shouldRetry = attempt < retries && (!isApiError || error.retryable);

            if (shouldRetry) {
                const delay = getBackoffDelay(attempt, baseDelay, maxDelay);
                await sleep(delay);
            }
        }
    }

    throw lastError || new ApiError('Unknown error');
}

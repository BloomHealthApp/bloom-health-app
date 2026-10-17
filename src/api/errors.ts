export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
    public retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  get retryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network request failed') {
    super(message);
    this.name = 'NetworkError';
  }
}

export function isNetworkError(e: unknown): e is NetworkError {
  return e instanceof NetworkError;
}

/** True for failures worth retrying with backoff (offline, timeouts, 5xx, 429). */
export function isRetryable(e: unknown): boolean {
  return e instanceof NetworkError || (e instanceof ApiError && e.retryable);
}

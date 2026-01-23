export const STORE_NAME = 'core/upload-media';

/**
 * Default maximum number of concurrent uploads.
 */
export const DEFAULT_MAX_CONCURRENT_UPLOADS = 5;

/**
 * Default maximum number of retry attempts for failed uploads.
 */
export const DEFAULT_MAX_RETRY_ATTEMPTS = 3;

/**
 * Default initial delay in milliseconds before the first retry.
 */
export const DEFAULT_INITIAL_RETRY_DELAY_MS = 1000;

/**
 * Default maximum delay in milliseconds between retries.
 * The exponential backoff will not exceed this value.
 */
export const DEFAULT_MAX_RETRY_DELAY_MS = 30000;

/**
 * Default multiplier for exponential backoff calculation.
 * Each retry will wait (initialDelay * multiplier^attemptNumber).
 */
export const DEFAULT_BACKOFF_MULTIPLIER = 2;

/**
 * Default jitter factor to add randomness to retry delays.
 * Helps prevent thundering herd problems when multiple uploads fail.
 * Value of 0.1 means +/- 10% variation.
 */
export const DEFAULT_RETRY_JITTER = 0.1;

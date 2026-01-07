/**
 * Request Deduplication Utility
 * Prevents duplicate in-flight requests (e.g., dashboard spam refresh)
 * 
 * USAGE:
 * import { deduplicatedFetch } from '@/lib/request-dedup';
 * 
 * // In your API route or client:
 * const data = await deduplicatedFetch('stats:school123', () => fetchStats());
 */

// In-memory store for pending requests
const pendingRequests = new Map();

// Cleanup interval (60 seconds)
const CLEANUP_INTERVAL = 60 * 1000;
const REQUEST_TTL = 100; // 100ms dedup window

/**
 * Execute a function with deduplication
 * If same key is requested while previous request is in-flight, reuse result
 * 
 * @param {string} key - Unique identifier for the request
 * @param {Function} fn - Async function to execute
 * @param {number} ttl - Time window for deduplication (default 100ms)
 */
export async function deduplicatedFetch(key, fn, ttl = REQUEST_TTL) {
    const now = Date.now();

    // Check if we have a pending request
    const pending = pendingRequests.get(key);
    if (pending && now - pending.timestamp < ttl) {
        // Reuse in-flight request
        return pending.promise;
    }

    // Create new request
    const promise = fn();
    pendingRequests.set(key, { promise, timestamp: now });

    try {
        const result = await promise;
        return result;
    } finally {
        // Clean up after request completes (with small delay to catch rapid duplicates)
        setTimeout(() => {
            const current = pendingRequests.get(key);
            if (current && current.promise === promise) {
                pendingRequests.delete(key);
            }
        }, ttl);
    }
}

/**
 * Deduplicate GET API calls on the client side
 * Useful for dashboard components that might re-render rapidly
 */
export function createClientDeduplicator() {
    const cache = new Map();

    return async function dedupFetch(url, options = {}) {
        const key = `${options.method || 'GET'}:${url}`;
        const now = Date.now();

        const existing = cache.get(key);
        if (existing && now - existing.timestamp < 100) {
            return existing.promise;
        }

        const promise = fetch(url, options).then(res => res.json());
        cache.set(key, { promise, timestamp: now });

        try {
            return await promise;
        } finally {
            setTimeout(() => cache.delete(key), 200);
        }
    };
}

// Periodic cleanup of stale entries (safety net)
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, value] of pendingRequests.entries()) {
            if (now - value.timestamp > CLEANUP_INTERVAL) {
                pendingRequests.delete(key);
            }
        }
    }, CLEANUP_INTERVAL);
}

export default deduplicatedFetch;

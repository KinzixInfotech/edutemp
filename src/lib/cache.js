// import redis from './redis';

// const DEFAULT_TTL = 3600; // 1 hour in seconds

// /**
//  * Generate a consistent cache key
//  * @param {string} prefix - The prefix for the key (e.g., 'student', 'school')
//  * @param {object|string} params - Parameters to uniquely identify the resource
//  * @returns {string} - The generated cache key
//  */
// export const generateKey = (prefix, params = {}) => {
//     if (typeof params === 'string') {
//         return `${prefix}:${params}`;
//     }
//     const sortedParams = Object.keys(params)
//         .sort()
//         .map(key => `${key}:${params[key]}`)
//         .join(':');
//     return `${prefix}:${sortedParams}`;
// };

// /**
//  * Get data from cache
//  * @param {string} key - Cache key
//  * @returns {Promise<any|null>} - Parsed data or null
//  */
// export const getCache = async (key) => {
//     try {
//         const data = await redis.get(key);
//         if (!data) return null;
//         // Upstash returns already-parsed data when using their SDK
//         // If it's a string, try to parse it; otherwise return as-is
//         if (typeof data === 'string') {
//             try {
//                 return JSON.parse(data);
//             } catch {
//                 return data;
//             }
//         }
//         return data;
//     } catch (error) {
//         console.warn(`Cache get error for key ${key}:`, error);
//         return null;
//     }
// };

// /**
//  * Set data in cache
//  * @param {string} key - Cache key
//  * @param {any} data - Data to store
//  * @param {number} ttl - Time to live in seconds
//  */
// export const setCache = async (key, data, ttl = DEFAULT_TTL) => {
//     try {
//         await redis.set(key, JSON.stringify(data), { ex: ttl });
//     } catch (error) {
//         console.warn(`Cache set error for key ${key}:`, error);
//     }
// };

// /**
//  * Delete data from cache
//  * @param {string} key - Cache key
//  */
// export const delCache = async (key) => {
//     try {
//         await redis.del(key);
//     } catch (error) {
//         console.warn(`Cache del error for key ${key}:`, error);
//     }
// };

// /**
//  * Invalidate keys matching a pattern
//  * @param {string} pattern - Glob pattern (e.g., 'student:*')
//  */
// export const invalidatePattern = async (pattern) => {
//     try {
//         let cursor = 0;
//         do {
//             const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
//             cursor = nextCursor;

//             if (keys.length > 0) {
//                 const pipeline = redis.pipeline();
//                 keys.forEach(key => pipeline.del(key));
//                 await pipeline.exec();
//             }
//         } while (cursor !== 0 && cursor !== '0');
//     } catch (error) {
//         console.warn(`Cache invalidate pattern error for ${pattern}:`, error);
//     }
// };

// /**
//  * Wrapper to get or set cache
//  * @param {string} key - Cache key
//  * @param {function} fetchFn - Function to fetch data if cache miss
//  * @param {number} ttl - TTL in seconds
//  * @returns {Promise<any>}
//  */
// export const remember = async (key, fetchFn, ttl = DEFAULT_TTL) => {
//     const cached = await getCache(key);
//     if (cached) return cached;

//     const data = await fetchFn();
//     if (data) {
//         await setCache(key, data, ttl);
//     }
//     return data;
// };

// lib/cache.js
import redis from './redis';

const DEFAULT_TTL = 3600;
const hasValue = (value) => value !== null && value !== undefined;

export const generateKey = (prefix, params = {}) => {
    if (typeof params === 'string') return `${prefix}:${params}`;
    const sortedParams = Object.keys(params)
        .filter((key) => hasValue(params[key]))
        .sort()
        .map(key => `${key}:${params[key]}`)
        .join(':');
    return `${prefix}:${sortedParams}`;
};

export const getCache = async (key) => {
    try {
        const data = await redis.get(key);
        if (data === null || data === undefined) return null;
        if (typeof data === 'string') {
            try { return JSON.parse(data); } catch { return data; }
        }
        return data;
    } catch (error) {
        console.warn(`Cache get error for key ${key}:`, error);
        return null;
    }
};

export const setCache = async (key, data, ttl = DEFAULT_TTL) => {
    try {
        await redis.set(key, JSON.stringify(data), { ex: ttl });
    } catch (error) {
        console.warn(`Cache set error for key ${key}:`, error);
    }
};

export const delCache = async (key) => {
    try {
        await redis.del(key);
    } catch (error) {
        console.warn(`Cache del error for key ${key}:`, error);
    }
};

export const invalidatePattern = async (pattern) => {
    try {
        let cursor = '0';
        do {
            const scanResult = await redis.scan(cursor, { match: pattern, count: 100 });
            const nextCursor = Array.isArray(scanResult)
                ? scanResult[0]
                : scanResult?.cursor ?? '0';
            const keys = Array.isArray(scanResult)
                ? (scanResult[1] || [])
                : (scanResult?.keys || []);

            cursor = String(nextCursor);

            if (keys.length > 0 && typeof redis.pipeline === 'function') {
                const pipeline = redis.pipeline();
                if (typeof pipeline?.del === 'function') {
                    keys.forEach(key => pipeline.del(key));
                    await pipeline.exec();
                } else {
                    await Promise.all(keys.map((key) => redis.del(key)));
                }
            }
        } while (cursor !== '0');
    } catch (error) {
        console.warn(`Cache invalidate pattern error for ${pattern}:`, error);
    }
};

// FIX: original used `if (cached)` which is falsy for 0, false, [], ""
// This caused stats with totalProfit=0 or totalRevenue=0 to be treated as
// a cache miss and re-fetched on every request, bypassing the cache entirely.
// Fix: use explicit null check — only treat actual null/undefined asw a miss.
export const remember = async (key, fetchFn, ttl = DEFAULT_TTL) => {
    const cached = await getCache(key);
    if (hasValue(cached)) return cached;

    const data = await fetchFn();
    // Also fix: store even if data is 0, false, or [] — those are valid results.
    // Only skip caching if data is null/undefined (fetch truly returned nothing).
    if (hasValue(data)) {
        await setCache(key, data, ttl);
    }
    return data;
};

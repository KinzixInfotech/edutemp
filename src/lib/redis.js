import { Redis } from '@upstash/redis';

let redis;

try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        // console.log('Upstash Redis client initialized');
    } else {
        console.warn('Upstash Redis credentials not found in environment variables. Caching will be disabled.');
        // Mock redis interface to prevent app crash if redis fails
        redis = {
            get: async () => null,
            set: async () => 'OK',
            del: async () => 0,
            keys: async () => [],
            scan: async () => [0, []],
            pipeline: () => ({ exec: async () => [] }),
        };
    }

} catch (error) {
    console.error('Failed to initialize Upstash Redis client:', error);
    redis = {
        get: async () => null,
        set: async () => 'OK',
        del: async () => 0,
        keys: async () => [],
        scan: async () => [0, []],
        pipeline: () => ({ exec: async () => [] }),
    };
}

export default redis;

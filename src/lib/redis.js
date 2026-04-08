import { Redis } from '@upstash/redis';

let redis;
const createNoopRedis = () => ({
    __enabled: false,
    get: async () => null,
    set: async () => 'OK',
    del: async () => 0,
    keys: async () => [],
    scan: async () => ['0', []],
    pipeline: () => {
        const ops = [];
        const pipelineApi = {
            del: (key) => {
                ops.push(['del', key]);
                return pipelineApi;
            },
            exec: async () => ops.map(() => 1),
        };
        return pipelineApi;
    },
});

try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        redis.__enabled = true;
        // console.log('Upstash Redis client initialized');
    } else {
        console.warn('Upstash Redis credentials not found in environment variables. Caching will be disabled.');
        redis = createNoopRedis();
    }

} catch (error) {
    console.error('Failed to initialize Upstash Redis client:', error);
    redis = createNoopRedis();
}

export default redis;

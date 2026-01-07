/**
 * API Utilities - Pagination, Responses, Timeouts, Security
 */

/**
 * Extract pagination parameters from request
 * @param {Request} req - Next.js Request object
 * @returns {object} - { page, limit, skip, take }
 */
export const getPagination = (req) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100); // Cap at 100

    return {
        page,
        limit,
        skip: (page - 1) * limit,
        take: limit
    };
};

/**
 * Helper to execute a Prisma query with pagination
 * @param {object} model - Prisma model delegate (e.g., prisma.student)
 * @param {object} args - Prisma query arguments (where, include, orderBy, etc.)
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Promise<object>} - { data, meta }
 */
export const paginate = async (model, args, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
        model.count({ where: args.where }),
        model.findMany({
            ...args,
            skip,
            take: limit,
        })
    ]);

    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPreviousPage: page > 1
        }
    };
};

/**
 * Standard API Response
 * @param {any} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Response}
 */
export const apiResponse = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
};

/**
 * Standard Error Response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Response}
 */
export const errorResponse = (message, status = 500) => {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
};

// ============================================
// 🔥 TIMEOUT & FAST FAILURE UTILITIES
// ============================================

/**
 * Execute a promise with timeout - fast failure for slow DB calls
 * @param {Promise} promise - The promise to execute
 * @param {number} ms - Timeout in milliseconds (default 10000ms)
 * @param {string} operation - Operation name for error message
 * @returns {Promise} - Result or timeout error
 */
export const withTimeout = async (promise, ms = 10000, operation = 'Operation') => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`${operation} timed out after ${ms}ms`));
        }, ms);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

/**
 * Parse request body with size validation
 * @param {Request} req - Next.js Request object
 * @param {number} maxBytes - Maximum body size in bytes (default 1MB)
 * @returns {Promise<object>} - Parsed JSON body
 */
export const parseBody = async (req, maxBytes = 1024 * 1024) => {
    const contentLength = req.headers.get('content-length');

    if (contentLength && parseInt(contentLength) > maxBytes) {
        throw new Error(`Payload too large. Maximum size: ${maxBytes / 1024}KB`);
    }

    const body = await req.json();
    return body;
};

/**
 * Safe database operation with timeout
 * @param {Function} dbFn - Async function containing DB operations
 * @param {number} timeout - Timeout in ms (default 10s)
 * @param {string} opName - Operation name for logging
 */
export const safeDbCall = async (dbFn, timeout = 10000, opName = 'DB operation') => {
    try {
        return await withTimeout(dbFn(), timeout, opName);
    } catch (error) {
        if (error.message.includes('timed out')) {
            console.error(`[TIMEOUT] ${opName}: ${error.message}`);
        }
        throw error;
    }
};

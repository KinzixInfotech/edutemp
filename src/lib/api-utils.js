/**
 * Extract pagination parameters from request
 * @param {Request} req - Next.js Request object
 * @returns {object} - { page, limit, skip, take }
 */
export const getPagination = (req) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    return {
        page,
        limit,
        skip,
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

import prisma from '@/lib/prisma';
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey } from "@/lib/cache";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
        return errorResponse("schoolId is required", 400);
    }

    try {
        const { page, limit, skip } = getPagination(req);
        const cacheKey = generateKey('schools:students', { schoolId, page, limit });

        const result = await remember(cacheKey, async () => {
            return await paginate(prisma.student, {
                where: { schoolId },
                select: { userId: true, name: true },
            }, page, limit);
        }, 300);

        // Return data array for backward compatibility
        return apiResponse(result.data);
    } catch (error) {
        console.error("Error fetching students:", error);
        return errorResponse('Failed to fetch students');
    }
}
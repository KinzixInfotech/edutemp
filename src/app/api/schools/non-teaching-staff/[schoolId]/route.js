import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey } from "@/lib/cache";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    if (!schoolId) {
        return errorResponse("Missing schoolId", 400);
    }

    try {
        const { page, limit, skip } = getPagination(req);
        const cacheKey = generateKey('non-teaching-staff', { schoolId, page, limit });

        const result = await remember(cacheKey, async () => {
            return await paginate(prisma.NonTeachingStaff, {
                where: { schoolId },
                include: {
                    user: true,
                },
            }, page, limit);
        }, 300);

        // Return data array for backward compatibility
        return apiResponse(result.data);
    } catch (error) {
        console.error("❌ Fetch non teaching staff error:", error);
        return errorResponse("Failed to fetch non teaching staff");
    }
}

import prisma from "@/lib/prisma"
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils"
import { remember, generateKey } from "@/lib/cache"

export async function GET(req) {
    try {
        const { page, limit, skip } = getPagination(req);

        // Cache key based on pagination to cache specific pages
        const cacheKey = generateKey('schools:all', { page, limit });

        const result = await remember(cacheKey, async () => {
            return await paginate(prisma.school, {
                orderBy: { createdAt: 'desc' },
                // Select only necessary fields for list view to reduce payload
                select: {
                    id: true,
                    name: true,
                    schoolCode: true,
                    location: true,
                    contactNumber: true,
                    createdAt: true,
                    // Add other essential fields here, avoid large JSON blobs if possible
                }
            }, page, limit);
        }, 300); // Cache for 5 minutes

        // Return data array for backward compatibility
        return apiResponse(result.data);
    } catch (err) {
        console.error("Error fetching schools:", err);
        return errorResponse("Failed to fetch schools");
    }
}

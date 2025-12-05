import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey } from "@/lib/cache";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    if (!schoolId) {
        return errorResponse("Missing schoolId", 400);
    }

    let include = { user: true }; // always include user

    const includeParam = searchParams.get("include");
    if (includeParam) {
        try {
            // Try to parse JSON first
            if (includeParam.trim().startsWith("{")) {
                // If they send something like `?include={"Class":{"include":{"sections":true}}}`app
                include = { ...include, ...JSON.parse(includeParam) };
            } else {
                // If they send a comma-separated list like "class,sections"
                includeParam.split(",").forEach((relation) => {
                    if (relation && relation !== "user") {
                        include[relation] = true;
                    }
                });
            }
        } catch (err) {
            console.warn("Invalid include param:", includeParam);
        }
    }

    try {
        const { page, limit, skip } = getPagination(req);

        // Include 'include' param in cache key to handle different relation requests
        const cacheKey = generateKey('teaching-staff', { schoolId, include: JSON.stringify(include), page, limit });

        const result = await remember(cacheKey, async () => {
            return await paginate(prisma.teachingStaff, {
                where: { schoolId },
                include,
            }, page, limit);
        }, 300);

        // Return data array for backward compatibility
        return apiResponse(result.data);
    } catch (error) {
        console.error("❌ Fetch teaching staff error:", error);
        return errorResponse("Failed to fetch teaching staff");
    }
}

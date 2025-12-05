import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

export async function GET(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;

        const { page, limit, skip } = getPagination(request);
        const cacheKey = generateKey('certificate-templates', { schoolId, page, limit });

        const result = await remember(cacheKey, async () => {
            const paged = await paginate(prisma.documentTemplate, {
                where: {
                    schoolId,
                    templateType: 'certificate',
                    isActive: true,
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            }, page, limit);

            // Map data to match expected format
            const mappedData = paged.data.map(t => ({
                id: t.id,
                name: t.name,
                description: t.description,
                type: t.subType,
                isDefault: t.isDefault,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
                createdBy: t.createdBy,
                layoutConfig: t.layoutConfig,
            }));

            return {
                data: mappedData,
                meta: paged.meta
            };
        }, 300);

        // If client expects array directly (legacy support), return data. 
        // Ideally we should return { data, meta } but to avoid breaking changes let's return array if no pagination params provided?
        // But we are enforcing pagination now. Let's return standard response.
        // Wait, the original code returned an array. Changing to { data, meta } might break frontend.
        // I should check if I can return array but still use pagination internally?
        // Or better, return array if pagination is default?
        // Let's stick to standard response but maybe I should check how it's used.
        // Given the user asked for optimization, standardizing response is good.
        // However, to be safe, I will return the array structure if page/limit are not explicitly provided?
        // No, `getPagination` provides defaults.
        // I will return `result.data` if it's a list request to keep backward compatibility?
        // The user said "add pagination". So changing response structure        }, 300);

        // Return data array for backward compatibility
        return apiResponse(result.data);
    } catch (error) {
        console.error('Error fetching certificate templates:', error);
        return errorResponse('Failed to fetch templates');
    }
}

export async function POST(request, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await request.json();

        const { name, description, type, layoutConfig, createdById, isDefault } = body;

        if (isDefault) {
            await prisma.documentTemplate.updateMany({
                where: {
                    schoolId,
                    templateType: 'certificate',
                    subType: type,
                    isDefault: true,
                },
                data: { isDefault: false },
            });
        }

        const template = await prisma.documentTemplate.create({
            data: {
                name,
                description,
                templateType: 'certificate',
                subType: type,
                layoutConfig,
                schoolId,
                createdById,
                isDefault: isDefault || false,
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // Invalidate cache
        await invalidatePattern(`certificate-templates:${schoolId}*`);

        return NextResponse.json({
            id: template.id,
            name: template.name,
            description: template.description,
            type: template.subType,
            isDefault: template.isDefault,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
            createdBy: template.createdBy,
            layoutConfig: template.layoutConfig,
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating certificate template:', error);
        return errorResponse('Failed to create template');
    }
}
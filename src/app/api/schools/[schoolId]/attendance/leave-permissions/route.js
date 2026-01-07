// app/api/schools/[schoolId]/attendance/leave-permissions/route.js
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, invalidatePattern, generateKey } from '@/lib/cache';

/**
 * GET - Fetch leave approval permissions and check if current role can approve
 * Query params:
 * - viewerRole: 'ADMIN' | 'PRINCIPAL' | 'DIRECTOR' - to check permissions for specific role
 */
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const viewerRole = searchParams.get('viewerRole');

    try {
        const cacheKey = generateKey('attendance:leave-permissions', { schoolId });

        const config = await remember(cacheKey, async () => {
            let attendanceConfig = await prisma.attendanceConfig.findUnique({
                where: { schoolId },
                select: {
                    id: true,
                    adminCanApproveLeaves: true,
                    principalCanApproveLeaves: true,
                    directorCanApproveLeaves: true,
                    directorOverridesAll: true,
                    principalOverridesAdmin: true,
                    autoApproveLeaves: true
                }
            });

            // If no config exists, return defaults
            if (!attendanceConfig) {
                attendanceConfig = {
                    adminCanApproveLeaves: true,
                    principalCanApproveLeaves: true,
                    directorCanApproveLeaves: true,
                    directorOverridesAll: false,
                    principalOverridesAdmin: false,
                    autoApproveLeaves: false
                };
            }

            return attendanceConfig;
        }, 600); // Cache for 10 minutes

        // Calculate effective permissions based on hierarchy
        let permissions = {
            adminCanApprove: config.adminCanApproveLeaves,
            principalCanApprove: config.principalCanApproveLeaves,
            directorCanApprove: config.directorCanApproveLeaves
        };

        // Apply hierarchy overrides
        if (config.directorOverridesAll) {
            permissions.adminCanApprove = false;
            permissions.principalCanApprove = false;
        } else if (config.principalOverridesAdmin) {
            permissions.adminCanApprove = false;
        }

        // Calculate if the viewer can approve
        let canApprove = false;
        let isReadOnly = true;

        if (viewerRole) {
            const role = viewerRole.toUpperCase();
            switch (role) {
                case 'DIRECTOR':
                    canApprove = permissions.directorCanApprove;
                    break;
                case 'PRINCIPAL':
                    canApprove = permissions.principalCanApprove;
                    break;
                case 'ADMIN':
                    canApprove = permissions.adminCanApprove;
                    break;
                default:
                    canApprove = false;
            }
            isReadOnly = !canApprove;
        }

        return NextResponse.json({
            config: {
                adminCanApproveLeaves: config.adminCanApproveLeaves,
                principalCanApproveLeaves: config.principalCanApproveLeaves,
                directorCanApproveLeaves: config.directorCanApproveLeaves,
                directorOverridesAll: config.directorOverridesAll,
                principalOverridesAdmin: config.principalOverridesAdmin,
                autoApproveLeaves: config.autoApproveLeaves
            },
            permissions,
            viewer: viewerRole ? {
                role: viewerRole.toUpperCase(),
                canApprove,
                isReadOnly
            } : null
        });

    } catch (error) {
        console.error('Leave permissions fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch leave permissions',
            details: error.message
        }, { status: 500 });
    }
}

/**
 * PUT - Update leave approval hierarchy settings
 * Only Director can update these settings
 */
export async function PUT(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const {
        updatedBy,
        updaterRole,
        adminCanApproveLeaves,
        principalCanApproveLeaves,
        directorCanApproveLeaves,
        directorOverridesAll,
        principalOverridesAdmin
    } = body;

    // Validate required fields
    if (!updatedBy || !updaterRole) {
        return NextResponse.json({
            error: 'updatedBy and updaterRole are required'
        }, { status: 400 });
    }

    // Only Director can modify these settings
    if (updaterRole.toUpperCase() !== 'DIRECTOR') {
        return NextResponse.json({
            error: 'Only Directors can modify leave approval hierarchy settings'
        }, { status: 403 });
    }

    try {
        // Build update data with only provided fields
        const updateData = {};
        if (adminCanApproveLeaves !== undefined) updateData.adminCanApproveLeaves = adminCanApproveLeaves;
        if (principalCanApproveLeaves !== undefined) updateData.principalCanApproveLeaves = principalCanApproveLeaves;
        if (directorCanApproveLeaves !== undefined) updateData.directorCanApproveLeaves = directorCanApproveLeaves;
        if (directorOverridesAll !== undefined) updateData.directorOverridesAll = directorOverridesAll;
        if (principalOverridesAdmin !== undefined) updateData.principalOverridesAdmin = principalOverridesAdmin;

        // Upsert the config
        const config = await prisma.attendanceConfig.upsert({
            where: { schoolId },
            update: updateData,
            create: {
                schoolId,
                adminCanApproveLeaves: adminCanApproveLeaves ?? true,
                principalCanApproveLeaves: principalCanApproveLeaves ?? true,
                directorCanApproveLeaves: directorCanApproveLeaves ?? true,
                directorOverridesAll: directorOverridesAll ?? false,
                principalOverridesAdmin: principalOverridesAdmin ?? false
            },
            select: {
                id: true,
                adminCanApproveLeaves: true,
                principalCanApproveLeaves: true,
                directorCanApproveLeaves: true,
                directorOverridesAll: true,
                principalOverridesAdmin: true
            }
        });

        // Invalidate cached permissions
        await invalidatePattern('attendance:leave-permissions*');

        return NextResponse.json({
            success: true,
            message: 'Leave approval settings updated successfully',
            config
        });

    } catch (error) {
        console.error('Leave permissions update error:', error);
        return NextResponse.json({
            error: 'Failed to update leave permissions',
            details: error.message
        }, { status: 500 });
    }
}

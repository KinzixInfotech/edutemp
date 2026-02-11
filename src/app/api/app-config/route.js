import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET — Public: returns the app config
export async function GET() {
    try {
        let config = await prisma.appConfig.findFirst();

        // Auto-create default config if none exists
        if (!config) {
            config = await prisma.appConfig.create({
                data: {
                    currentVersion: "1.0.1",
                    minimumVersion: "1.0.0",
                    latestVersion: "1.0.1",
                    updateMode: "FLEXIBLE",
                    appName: "EduBreezy",
                    bundleId: "com.kinzix.edubreezy",
                    easProjectId: "705e829d-f67a-48d6-b0aa-654cb5ae901d",
                },
            });
        }

        return NextResponse.json(config);
    } catch (error) {
        console.error("Error fetching app config:", error);
        return NextResponse.json(
            { error: "Failed to fetch app config" },
            { status: 500 }
        );
    }
}

// PUT — Protected: update app config (SUPER_ADMIN only)
export async function PUT(request) {
    try {
        const body = await request.json();
        const { role } = body;

        // Check SUPER_ADMIN role
        if (role !== "SUPER_ADMIN") {
            return NextResponse.json(
                { error: "Only SUPER_ADMIN can update app config" },
                { status: 403 }
            );
        }

        // Find existing or create
        let config = await prisma.appConfig.findFirst();

        if (config) {
            config = await prisma.appConfig.update({
                where: { id: config.id },
                data: {
                    currentVersion: body.currentVersion,
                    minimumVersion: body.minimumVersion,
                    latestVersion: body.latestVersion,
                    androidVersionCode: body.androidVersionCode ? parseInt(body.androidVersionCode) : undefined,
                    iosBuildNumber: body.iosBuildNumber ? parseInt(body.iosBuildNumber) : undefined,
                    updateMode: body.updateMode,
                    forceUpdate: body.forceUpdate,
                    maintenanceMode: body.maintenanceMode,
                    maintenanceMessage: body.maintenanceMessage,
                    changelog: body.changelog,
                    androidStoreUrl: body.androidStoreUrl,
                    iosStoreUrl: body.iosStoreUrl,
                    appName: body.appName,
                    bundleId: body.bundleId,
                    easProjectId: body.easProjectId,
                },
            });
        } else {
            config = await prisma.appConfig.create({ data: body });
        }

        return NextResponse.json(config);
    } catch (error) {
        console.error("Error updating app config:", error);
        return NextResponse.json(
            { error: "Failed to update app config" },
            { status: 500 }
        );
    }
}

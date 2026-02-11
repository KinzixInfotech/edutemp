import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Semantic version comparison: returns -1, 0, or 1
function compareVersions(a, b) {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}

// GET /api/app-config/check-update?version=1.0.0&platform=android
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const appVersion = searchParams.get("version");
        const platform = searchParams.get("platform") || "android";

        if (!appVersion) {
            return NextResponse.json(
                { error: "version query parameter is required" },
                { status: 400 }
            );
        }

        const config = await prisma.appConfig.findFirst();

        if (!config) {
            return NextResponse.json({
                needsUpdate: false,
                maintenanceMode: false,
            });
        }

        // Check maintenance mode first
        if (config.maintenanceMode) {
            return NextResponse.json({
                needsUpdate: false,
                maintenanceMode: true,
                maintenanceMessage: config.maintenanceMessage || "App is under maintenance. Please try again later.",
            });
        }

        const isBelowMinimum = compareVersions(appVersion, config.minimumVersion) < 0;
        const isBelowLatest = compareVersions(appVersion, config.latestVersion) < 0;

        let needsUpdate = false;
        let updateType = "NONE";
        let canSkip = true;

        if (isBelowMinimum || config.forceUpdate) {
            // Critical: force update
            needsUpdate = true;
            updateType = "IMMEDIATE";
            canSkip = false;
        } else if (isBelowLatest && config.updateMode !== "NONE") {
            // Optional update available
            needsUpdate = true;
            updateType = config.updateMode; // FLEXIBLE or IMMEDIATE
            canSkip = config.updateMode === "FLEXIBLE";
        }

        // Get recent changelog entries (only entries newer than app version)
        let recentChangelog = [];
        if (Array.isArray(config.changelog)) {
            recentChangelog = config.changelog.filter(
                (entry) => compareVersions(entry.version, appVersion) > 0
            );
        }

        return NextResponse.json({
            needsUpdate,
            updateType,
            canSkip,
            currentVersion: config.currentVersion,
            latestVersion: config.latestVersion,
            minimumVersion: config.minimumVersion,
            maintenanceMode: false,
            storeUrl: platform === "ios" ? config.iosStoreUrl : config.androidStoreUrl,
            changelog: recentChangelog,
            androidVersionCode: config.androidVersionCode,
            iosBuildNumber: config.iosBuildNumber,
        });
    } catch (error) {
        console.error("Error checking for update:", error);
        return NextResponse.json(
            { error: "Failed to check for updates" },
            { status: 500 }
        );
    }
}

// Test API: /api/test/push-notification
export const runtime = "nodejs";
// Usage: POST with { userId } or { userIds: [...] } and optional { title, message }
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { messaging } from "@/lib/firebase-admin";

export async function POST(request) {
    try {
        let earlyTestResult = null;
        const body = await request.json();
        const { userId, userIds: rawUserIds, title = "Test Notification", message = "This is a test push notification!" } = body;

        const userIds = rawUserIds || (userId ? [userId] : []);

        if (userIds.length === 0) {
            return NextResponse.json({ error: "Provide userId or userIds[]" }, { status: 400 });
        }

        console.log("\n" + "=".repeat(70));
        console.log("🧪 PUSH NOTIFICATION TEST");
        console.log("=".repeat(70));
        console.log("📋 Target user IDs:", userIds);

        console.log("\n🔥 Firebase Admin Instance Check (Inside endpoint):");
        console.log("   Name:", messaging.app.name);
        console.log("   Project:", messaging.app.options.credential.projectId);
        console.log("   Client Email:", messaging.app.options.credential.clientEmail);
        console.log("   Has Private Key:", !!messaging.app.options.credential.privateKey);

        // 1. Fetch all devices for these users
        const devices = await prisma.userDevice.findMany({
            where: { userId: { in: userIds } },
            select: {
                id: true,
                userId: true,
                fcmToken: true,
                platform: true,
                isActive: true,
                lastActive: true,
                createdAt: true,
                user: { select: { name: true, email: true } },
            },
        });

        console.log(`\n📱 Found ${devices.length} device(s) in UserDevice table:`);
        devices.forEach((d, i) => {
            console.log(`  [${i + 1}] Device ID: ${d.id}`);
            console.log(`      User: ${d.user.name} (${d.user.email})`);
            console.log(`      Platform: ${d.platform || "unknown"}`);
            console.log(`      Active: ${d.isActive}`);
            console.log(`      Last Active: ${d.lastActive}`);
            console.log(`      Token: ${d.fcmToken.substring(0, 30)}...`);
            console.log("");
        });

        // Also check legacy fcmToken on User model
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true, fcmToken: true },
        });

        console.log("📦 Legacy User.fcmToken values:");
        users.forEach((u) => {
            console.log(`  ${u.name} (${u.email}): ${u.fcmToken ? u.fcmToken.substring(0, 30) + "..." : "NULL"}`);
        });

        // Filter active devices only
        const activeDevices = devices.filter((d) => d.isActive);
        const tokens = activeDevices.map((d) => d.fcmToken);

        if (tokens.length === 0) {
            const result = {
                success: false,
                error: "No active device tokens found",
                totalDevices: devices.length,
                activeDevices: 0,
                users: users.map((u) => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    legacyToken: u.fcmToken ? "present" : "null",
                })),
            };
            console.log("\n❌ RESULT:", JSON.stringify(result, null, 2));
            return NextResponse.json(result, { status: 404 });
        }

        // 2. Build FCM message and send
        const fcmMessage = {
            notification: { title, body: message },
            data: {
                click_action: "FLUTTER_NOTIFICATION_CLICK",
                title,
                body: message,
                testMode: "true",
                sentAt: new Date().toISOString(),
            }
        };

        console.log(`\n🚀 Sending to ${tokens.length} token(s) individually...`);

        // Replacing sendEachForMulticast with individual send calls via Promise.all
        // This avoids a weird third-party-auth-error bug where Next.js breaks batch HTTP auth headers
        const sendPromises = activeDevices.map(device => {
            // Remove the 'tokens' array from fcmMessage so we don't send an invalid payload
            const { tokens: _ignored, ...individualMessage } = fcmMessage;
            individualMessage.token = device.fcmToken;

            return messaging.send(individualMessage)
                .then(messageId => ({ success: true, messageId, device }))
                .catch(error => ({ success: false, error, device }));
        });

        const results = await Promise.all(sendPromises);

        let successCount = 0;
        let failureCount = 0;

        // 3. Build detailed per-device results
        const deviceResults = results.map((resp, idx) => {
            const device = resp.device;
            if (resp.success) successCount++; else failureCount++;

            const result = {
                deviceId: device.id,
                userId: device.userId,
                userName: device.user.name,
                userEmail: device.user.email,
                platform: device.platform || "unknown",
                tokenPreview: device.fcmToken.substring(0, 30) + "...",
                success: resp.success,
                messageId: resp.success ? resp.messageId : null,
                error: resp.success ? null : {
                    code: resp.error?.code,
                    message: resp.error?.message,
                },
            };

            const icon = resp.success ? "✅" : "❌";
            console.log(`\n   ${icon} Device ${idx + 1}:`);
            console.log(`      ID: ${device.id}`);
            console.log(`      User: ${device.user.name} (${device.user.email})`);
            console.log(`      Platform: ${device.platform || "unknown"}`);
            console.log(`      Token: ${device.fcmToken.substring(0, 30)}...`);
            if (resp.success) {
                console.log(`      Message ID: ${resp.messageId}`);
            } else {
                console.log(`      Error: ${resp.error?.code} — ${resp.error?.message}`);
            }

            return result;
        });

        console.log(`\n📊 FCM RESPONSE:`);
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Failed:  ${failureCount}`);

        console.log("\n" + "=".repeat(70));
        console.log("🧪 TEST COMPLETE");
        console.log("=".repeat(70) + "\n");

        return NextResponse.json({
            success: true,
            earlyTestResult,
            debugAuth: {
                name: messaging.app.name,
                projectId: messaging.app.options.credential.projectId,
                clientEmail: messaging.app.options.credential.clientEmail,
                hasPrivateKey: !!messaging.app.options.credential.privateKey,
            },
            summary: {
                totalUsers: userIds.length,
                totalDevices: devices.length,
                activeDevices: activeDevices.length,
                sent: successCount,
                failed: failureCount,
            },
            notification: { title, message },
            devices: deviceResults,
        });
    } catch (error) {
        console.error("🧪 TEST ERROR:", error);
        return NextResponse.json(
            { success: false, error: error.message, stack: error.stack },
            { status: 500 }
        );
    }
}

// GET — show all registered devices (quick check)
export async function GET() {
    try {
        const devices = await prisma.userDevice.findMany({
            orderBy: { lastActive: "desc" },
            take: 50,
            select: {
                id: true,
                userId: true,
                fcmToken: true,
                platform: true,
                isActive: true,
                lastActive: true,
                createdAt: true,
                user: { select: { name: true, email: true } },
            },
        });

        return NextResponse.json({
            totalDevices: devices.length,
            devices: devices.map((d) => ({
                id: d.id,
                userId: d.userId,
                userName: d.user.name,
                userEmail: d.user.email,
                platform: d.platform || "unknown",
                isActive: d.isActive,
                lastActive: d.lastActive,
                createdAt: d.createdAt,
                tokenPreview: d.fcmToken.substring(0, 30) + "...",
            })),
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

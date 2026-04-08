import { NextResponse } from "next/server";
import { messaging } from "@/lib/firebase-admin";

export async function POST() {
    try {
        const adminApp = messaging.app;
        
        // Attempt a real FCM send with this instance to verify JWT auth headers
        let fcmResult;
        try {
            await messaging.send({ 
                token: 'fXuDMj_7J0T-nviiMj2_F4:APA91bH_OQeXwJq8mUaY7y', // The exact prefix from the user's log
                notification: { title: 't' },
                data: {
                    click_action: "FLUTTER_NOTIFICATION_CLICK",
                    title: "t",
                    body: "m",
                    testMode: "true",
                    sentAt: new Date().toISOString(),
                }
            });
            fcmResult = 'ok';
        } catch (e) {
            fcmResult = e.code + ' - ' + e.message;
        }

        return NextResponse.json({
            name: adminApp.name,
            projectId: adminApp.options.credential.projectId,
            clientEmail: adminApp.options.credential.clientEmail,
            hasPrivateKey: !!adminApp.options.credential.privateKey,
            fcmSendResult: fcmResult
        });
    } catch (e) {
        return NextResponse.json({ error: e.message });
    }
}

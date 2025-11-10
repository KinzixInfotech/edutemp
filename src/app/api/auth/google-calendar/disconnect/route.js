
// ============================================
// FILE: app/api/auth/google-calendar/disconnect/route.js
// Disconnect Google Calendar
// ============================================

import { google } from "googleapis";
import prisma from "@/lib/prisma";

export async function POST(req) {
    try {
        const { userId, email } = await req.json();

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'userId is required' }),
                { status: 400 }
            );
        }

        // Get account from database
        const account = await prisma.gmailAccount.findFirst({
            where: {
                userId,
                ...(email && { email }),
            },
        });

        if (account?.accessToken) {
            try {
                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET
                );

                oauth2Client.setCredentials({
                    access_token: account.accessToken,
                });

                // Revoke the token
                await oauth2Client.revokeCredentials();
            } catch (revokeError) {
                console.error('Token revocation error:', revokeError);
                // Continue with deletion even if revocation fails
            }
        }

        // Delete from database
        await prisma.gmailAccount.deleteMany({
            where: {
                userId,
                ...(email && { email }),
            },
        });

        return new Response(
            JSON.stringify({ message: 'Google Calendar disconnected successfully' }),
            { status: 200 }
        );
    } catch (error) {
        console.error('Disconnect Error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to disconnect Google Calendar' }),
            { status: 500 }
        );
    }
}
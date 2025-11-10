
// ============================================
// FILE: app/api/auth/google-calendar/refresh/route.js
// Refresh Google Calendar Access Token
// ============================================

import { google } from "googleapis";
import prisma from "@/lib/prisma";

export async function POST(req) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'userId is required' }),
                { status: 400 }
            );
        }

        const account = await prisma.gmailAccount.findFirst({
            where: { userId },
            orderBy: { lastUsedAt: 'desc' },
        });

        if (!account?.refreshToken) {
            return new Response(
                JSON.stringify({ error: 'No refresh token found. Please reconnect.' }),
                { status: 404 }
            );
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
            refresh_token: account.refreshToken,
        });

        // This will automatically refresh the token
        const { credentials } = await oauth2Client.refreshAccessToken();

        // Update access token in database
        await prisma.gmailAccount.update({
            where: { id: account.id },
            data: {
                accessToken: credentials.access_token,
                lastUsedAt: new Date(),
            },
        });

        return new Response(
            JSON.stringify({
                message: 'Token refreshed successfully',
                accessToken: credentials.access_token,
            }),
            { status: 200 }
        );
    } catch (error) {
        console.error('Token Refresh Error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to refresh token' }),
            { status: 500 }
        );
    }
}
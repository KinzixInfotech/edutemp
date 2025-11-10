// ============================================
// FILE: app/api/auth/google-calendar/callback/route.js
// Google Calendar OAuth Callback Handler
// ============================================

import { google } from "googleapis";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        const origin = req.headers.get("origin") || `${url.protocol}//${url.host}`;
        const redirectUri = `${origin}/api/auth/google-calendar/callback`;

        // Handle user denial
        if (error === 'access_denied') {
            return new Response(null, {
                status: 302,
                headers: { Location: `${origin}/dashboard/calendar?error=access_denied` },
            });
        }

        if (!code || !state) {
            return new Response(null, {
                status: 302,
                headers: { Location: `${origin}/dashboard/calendar?error=invalid_request` },
            });
        }

        const { userId, schoolId } = JSON.parse(state);

        if (!userId || !schoolId) {
            return new Response(
                JSON.stringify({ error: "Missing userId or schoolId" }),
                { status: 400 }
            );
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            redirectUri
        );

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get user info
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();

        // Verify user exists and belongs to school
        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                schoolId: schoolId,
            },
        });

        if (!user) {
            return new Response(null, {
                status: 302,
                headers: { Location: `${origin}/dashboard/calendar?error=unauthorized` },
            });
        }

        // Store or update Google Calendar credentials
        await prisma.gmailAccount.upsert({
            where: {
                userId_email: {
                    userId,
                    email: userInfo.data.email,
                },
            },
            update: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || undefined,
                name: userInfo.data.name,
                avatar: userInfo.data.picture,
                lastUsedAt: new Date(),
            },
            create: {
                userId,
                email: userInfo.data.email,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token || "",
                name: userInfo.data.name,
                avatar: userInfo.data.picture,
                lastUsedAt: new Date(),
            },
        });

        return new Response(null, {
            status: 302,
            headers: {
                Location: `${origin}/dashboard/calendar?connected=true`,
            },
        });
    } catch (err) {
        console.error("Google Calendar OAuth callback error:", err.response?.data || err);
        const origin = req.headers.get("origin") || "http://localhost:3000";
        return new Response(null, {
            status: 302,
            headers: { Location: `${origin}/dashboard/calendar?error=auth_failed` },
        });
    }
}

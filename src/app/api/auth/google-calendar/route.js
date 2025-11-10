// ============================================
// FILE: app/api/auth/google-calendar/route.js
// Google Calendar OAuth Initiation
// ============================================

import { google } from "googleapis";

export async function GET(req) {
    try {
        const url = new URL(req.url);
        const userId = url.searchParams.get('userId');
        const schoolId = url.searchParams.get('schoolId');

        if (!userId || !schoolId) {
            return new Response(
                JSON.stringify({ error: 'userId and schoolId are required' }),
                { status: 400 }
            );
        }

        const origin = req.headers.get("origin") || `${url.protocol}//${url.host}`;
        const redirectUri = `${origin}/api/auth/google-calendar/callback`;
        console.log(redirectUri, 'hi redirect uir');
        console.log(process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            redirectUri, 'json mansha');

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            redirectUri
        );

        const scopes = [
            // Calendar access
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events.readonly',

            // User info
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ];


        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
            state: JSON.stringify({ userId, schoolId }),
        });

        return new Response(null, {
            status: 302,
            headers: { Location: authUrl },
        });
    } catch (error) {
        console.error('Google Calendar Auth Init Error:', error);
        return new Response(
            JSON.stringify({ error: 'Failed to initiate authentication' }),
            { status: 500 }
        );
    }
}



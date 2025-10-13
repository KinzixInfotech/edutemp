import { google } from "googleapis";

export async function GET(req) {
    // Get full origin dynamically
    const origin = req.headers.get("origin") || `${req.url.split("/api")[0]}`;
    const redirectUri = `${origin}/api/gmail/callback`;

    const paramsurl = new URL(req.url);
    const userId = paramsurl.searchParams.get("userId");
    if (!userId) {
        return new Response(JSON.stringify({ error: "User ID is required" }), { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
    );

    const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/userinfo.profile",
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: scopes,
        state: JSON.stringify({ userId }),
    });

    return new Response(JSON.stringify({ url }), {
        headers: { "Content-Type": "application/json" },
    });
}
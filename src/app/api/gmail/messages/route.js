import { google } from "googleapis";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET(req) {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get("gmail_access_token")?.value;
    const refreshToken = cookieStore.get("gmail_refresh_token")?.value;
    const email = cookieStore.get("gmail_user_email")?.value;

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    // If no tokens in cookies, try fetching from database
    if (!accessToken || !refreshToken || !email) {
        if (!userId) {
            return new Response(JSON.stringify({ error: "User ID required when tokens are missing" }), {
                status: 400,
            });
        }
        const account = await prisma.gmailAccount.findUnique({
            where: {
                userId_email: { userId, email: email || "" },
            },
        });
        if (!account) {
            return new Response(JSON.stringify({ error: "No Gmail account found. Please reauthorize." }), {
                status: 401,
            });
        }
        accessToken = account.accessToken;
        if (!account.refreshToken) {
            return new Response(JSON.stringify({ error: "Refresh token missing. Please reauthorize." }), {
                status: 401,
            });
        }
        // Update cookies with DB tokens
        cookieStore.set("gmail_access_token", accessToken, {
            httpOnly: true,
            path: "/",
            maxAge: 3600,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });
        cookieStore.set("gmail_refresh_token", account.refreshToken, {
            httpOnly: true,
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });
        if (account.email) {
            cookieStore.set("gmail_user_email", account.email, {
                path: "/",
                maxAge: 60 * 60 * 24 * 7,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
            });
        }
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${url.protocol}//${url.host}/api/gmail/callback` // Dynamic redirect URI
    );

    // Set credentials
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    try {
        // Refresh access token if needed
        const tokenResponse = await oauth2Client.getAccessToken();
        accessToken = tokenResponse?.token || accessToken;
        oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

        // Update access token in cookie and database
        cookieStore.set("gmail_access_token", accessToken, {
            httpOnly: true,
            path: "/",
            maxAge: 3600,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });
        if (userId && email) {
            await prisma.gmailAccount.update({
                where: { userId_email: { userId, email } },
                data: { accessToken },
            });
        }

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Get pageToken from query
        const pageToken = url.searchParams.get("pageToken") || undefined;

        const listRes = await gmail.users.messages.list({
            userId: "me",
            maxResults: 10,
            pageToken,
        });

        const messages = listRes.data.messages || [];
        const detailedMessages = await Promise.all(
            messages.map(async (msg) => {
                const full = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id,
                    format: "metadata",
                    metadataHeaders: ["From", "Subject", "Date"],
                });

                const headers = full.data.payload?.headers || [];
                const getHeader = (n) => headers.find((h) => h.name === n)?.value || "";

                return {
                    id: msg.id,
                    snippet: full.data.snippet,
                    subject: getHeader("Subject"),
                    from: getHeader("From"),
                    date: getHeader("Date"),
                };
            })
        );

        return new Response(
            JSON.stringify({
                messages: detailedMessages,
                nextPageToken: listRes.data.nextPageToken || null,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Error fetching emails:", err.response?.data || err);
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
            { status: 500 }
        );
    }
}
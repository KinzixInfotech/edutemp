export const runtime = "nodejs";

import { google } from "googleapis";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET(req) {
    console.log("=== GMAIL API FETCH STARTED ===");

    const cookieStore = await cookies();
    console.log("Cookies fetched:", cookieStore);

    let accessToken = cookieStore.get("gmail_access_token")?.value;
    let refreshToken = cookieStore.get("gmail_refresh_token")?.value;
    let email = cookieStore.get("gmail_user_email")?.value;

    console.log("Initial tokens from cookies:", { accessToken, refreshToken, email });

    const url = new URL(req.url);
    console.log("Request URL:", url.href);

    const userId = url.searchParams.get("userId");
    const pageToken = url.searchParams.get("pageToken");
    // FIXED: Decode the email param to handle any encoding issues
    let requestedEmail = url.searchParams.get("email");
    if (requestedEmail) {
        requestedEmail = decodeURIComponent(requestedEmail);
    }
    console.log("Query Params:", { userId, pageToken, requestedEmail });

    // NEW: Handle account switching - override with specific email from DB
    if (requestedEmail && userId) {
        console.log(`🔄 Switching to requested email: ${requestedEmail}`);

        const account = await prisma.gmailAccount.findUnique({
            where: {
                userId_email: { userId, email: requestedEmail },
            },
        });

        if (!account) {
            console.error("No account found for requested email:", requestedEmail);
            return new Response(JSON.stringify({
                error: `No Gmail account found for ${requestedEmail}. Please reauthorize.`
            }), {
                status: 401,
            });
        }

        console.log("Found account for switching:", {
            email: account.email,
            hasAccessToken: !!account.accessToken,
            hasRefreshToken: !!account.refreshToken
        });

        accessToken = account.accessToken;
        refreshToken = account.refreshToken;
        email = account.email;

        // Update cookies with the switched account's tokens
        console.log("Updating cookies with switched account tokens...");
        cookieStore.set("gmail_access_token", accessToken || "", {
            httpOnly: true,
            path: "/",
            maxAge: 3600,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });
        cookieStore.set("gmail_refresh_token", refreshToken, {
            httpOnly: true,
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });
        cookieStore.set("gmail_user_email", email, {
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });

        console.log("✅ Cookies updated for switched account:", email);
    }
    // ORIGINAL: Fallback logic when tokens missing from cookies
    else if (!accessToken || !refreshToken || !email) {
        console.log("Tokens missing, fetching from database...");

        if (!userId) {
            console.error("User ID missing when tokens not found in cookies");
            return new Response(JSON.stringify({ error: "User ID required when tokens are missing" }), {
                status: 400,
            });
        }

        // FIXED: Use the cookie email if available, otherwise try to find a default account
        let targetEmail = email;
        let account;

        if (targetEmail) {
            // Try to find the specific account first
            account = await prisma.gmailAccount.findUnique({
                where: {
                    userId_email: { userId, email: targetEmail },
                },
            });
        }

        // If no specific account found or no email in cookies, get any account for this user
        if (!account) {
            console.log("No specific account found, trying to get any account for user...");
            account = await prisma.gmailAccount.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' }, // Most recent first
            });

            if (account) {
                targetEmail = account.email;
                console.log("Using fallback account:", targetEmail);
            }
        }

        console.log("Fetched account from DB:", account);

        if (!account) {
            console.error("No Gmail account found for userId:", userId);
            return new Response(JSON.stringify({ error: "No Gmail account found. Please reauthorize." }), {
                status: 401,
            });
        }

        accessToken = account.accessToken;
        refreshToken = account.refreshToken;
        email = account.email;

        console.log("Access token from DB:", !!accessToken);

        if (!refreshToken) {
            console.error("Refresh token missing in DB record");
            return new Response(JSON.stringify({ error: "Refresh token missing. Please reauthorize." }), {
                status: 401,
            });
        }

        console.log("Updating cookies with DB tokens...");
        cookieStore.set("gmail_access_token", accessToken || "", {
            httpOnly: true,
            path: "/",
            maxAge: 3600,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });
        cookieStore.set("gmail_refresh_token", refreshToken, {
            httpOnly: true,
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });
        cookieStore.set("gmail_user_email", email, {
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });

        console.log("Cookies updated from DB tokens successfully");
    }

    // Validate we have a refresh token
    if (!refreshToken) {
        console.error("No refresh token available after all fallbacks");
        return new Response(JSON.stringify({ error: "No valid refresh token. Please reauthorize." }), {
            status: 401,
        });
    }

    console.log("Creating OAuth2 client...");
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${url.protocol}//${url.host}/api/gmail/callback`
    );

    // Set credentials with both access and refresh tokens
    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
    });
    console.log("OAuth2 credentials set with tokens");

    try {
        console.log("Refreshing access token if needed...");
        const tokenResponse = await oauth2Client.getAccessToken();
        console.log("Token response:", tokenResponse);

        accessToken = tokenResponse?.token || accessToken;
        if (!accessToken) {
            throw new Error("Failed to obtain access token");
        }

        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken
        });
        console.log("OAuth2 client credentials updated:", { accessToken: !!accessToken });

        console.log("Updating cookies with refreshed access token...");
        cookieStore.set("gmail_access_token", accessToken, {
            httpOnly: true,
            path: "/",
            maxAge: 3600,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
        });

        // Update database with fresh access token
        if (userId && email) {
            console.log("Updating access token in database...");
            try {
                await prisma.gmailAccount.update({
                    where: { userId_email: { userId, email } },
                    data: { accessToken },
                });
                console.log("Database updated successfully");
            } catch (dbUpdateError) {
                console.error("Failed to update DB:", dbUpdateError);
                // Don't fail the request, just log the error
            }
        }

        console.log("Creating Gmail client...");
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        console.log("Fetching message list...");
        const listRes = await gmail.users.messages.list({
            userId: "me",
            maxResults: 10,
            pageToken: pageToken || undefined,
        });

        console.log("Message list response:", listRes.data);

        const messages = listRes.data.messages || [];
        console.log("Total messages fetched:", messages.length);

        const detailedMessages = await Promise.all(
            messages.map(async (msg, i) => {
                console.log(`Fetching message ${i + 1}/${messages.length}:`, msg.id);
                try {
                    const full = await gmail.users.messages.get({
                        userId: "me",
                        id: msg.id,
                        format: "metadata",
                        metadataHeaders: ["From", "Subject", "Date"],
                    });

                    const headers = full.data.payload?.headers || [];
                    const getHeader = (n) => headers.find((h) => h.name === n)?.value || "";

                    const messageData = {
                        id: msg.id,
                        snippet: full.data.snippet || "",
                        subject: getHeader("Subject") || "(No Subject)",
                        from: getHeader("From") || "Unknown Sender",
                        date: getHeader("Date") || new Date().toISOString(),
                        labelIds: msg.labelIds || [], // For unread/starred detection
                    };

                    console.log("Fetched message details:", {
                        id: msg.id,
                        subject: messageData.subject,
                        from: messageData.from
                    });
                    return messageData;
                } catch (msgError) {
                    console.error(`Error fetching message ${msg.id}:`, msgError);
                    return {
                        id: msg.id,
                        snippet: "",
                        subject: "(Error loading)",
                        from: "Error loading",
                        date: new Date().toISOString(),
                        labelIds: [],
                    };
                }
            })
        );

        console.log("All detailed messages fetched successfully for:", email);
        return new Response(
            JSON.stringify({
                messages: detailedMessages,
                nextPageToken: listRes.data.nextPageToken || null,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Error fetching emails:", err.response?.data || err);

        // Handle auth errors specifically
        if (err.response?.status === 401) {
            return new Response(
                JSON.stringify({ error: "Authentication failed. Please reauthorize Gmail." }),
                { status: 401 }
            );
        }

        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
            { status: 500 }
        );
    }
}
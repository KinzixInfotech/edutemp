import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const userId = url.searchParams.get("state"); // user ID passed in state

        // Validate presence of code
        if (!code) {
            return NextResponse.redirect(new URL("/calendar?error=no_code", req.url));
        }

        // Exchange code for tokens
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: "authorization_code",
            }),
        });

        const tokens = await tokenResponse.json();

        // If token exchange failed
        if (!tokens.access_token) {
            console.error("Token exchange failed:", tokens);
            return NextResponse.redirect(
                new URL("/dashboard/calendar?error=token_failed", req.url)
            );
        }

        // Fetch user info
        const userInfoResponse = await fetch(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            }
        );

        const userInfo = await userInfoResponse.json();
        console.log(userInfo, "from callback");

        // Validate user info
        if (!userInfo?.email) {
            console.error("Missing email in userInfo:", userInfo);
            return NextResponse.redirect(
                new URL("/dashboard/calendar?error=missing_email", req.url)
            );
        }

        // Store or update user in DB
        await prisma.gmailAccount.upsert({
            where: {
                userId_email: {
                    userId: userId || "unknown", // fallback if state was undefined
                    email: userInfo.email,
                },
            },
            update: {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                lastUsedAt: new Date(),
            },
            create: {
                userId: userId || "unknown",
                email: userInfo.email,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                name: userInfo.name,
                avatar: userInfo.picture,
            },
        });

        // Success redirect
        return NextResponse.redirect(new URL("/dashboard/calendar?success=true", req.url));
    } catch (error) {
        console.error("OAuth Callback Error:", error);
        return NextResponse.redirect(
            new URL("/dashboard/calendar?error=auth_failed", req.url)
        );
    }
}

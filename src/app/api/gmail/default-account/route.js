// NEW API: /api/gmail/default-account/route.js
export const runtime = "nodejs";

import prisma from "@/lib/prisma";

export async function GET(req) {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
        return new Response(JSON.stringify({ error: "User ID required" }), { status: 400 });
    }

    try {
        // NEW: Find the last used account (most recent lastUsedAt)
        const defaultAccount = await prisma.gmailAccount.findFirst({
            where: { userId },
            orderBy: { lastUsedAt: 'desc' }, // Assumes lastUsedAt field exists
        });

        if (!defaultAccount) {
            return new Response(JSON.stringify({ account: null }), { status: 200 });
        }

        return new Response(
            JSON.stringify({
                account: {
                    id: defaultAccount.id,
                    email: defaultAccount.email,
                    name: defaultAccount.name || defaultAccount.email.split('@')[0],
                    avatar: defaultAccount.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultAccount.email)}&background=0D8ABC&color=fff`,
                }
            }),
            { status: 200 }
        );
    } catch (err) {
        console.error("Error fetching default account:", err);
        return new Response(JSON.stringify({ error: "Failed to fetch default account" }), { status: 500 });
    }
}
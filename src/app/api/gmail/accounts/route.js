import prisma from "@/lib/prisma";
import { google } from "googleapis";

export async function GET(req) {
    try {
        const url = new URL(req.url);
        const userId = url.searchParams.get("userId");

        if (!userId) {
            return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400 });
        }

        const accounts = await prisma.gmailAccount.findMany({ where: { userId } });

        const updatedAccounts = await Promise.all(
            accounts.map(async (acc) => {
                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET
                );
                oauth2Client.setCredentials({
                    access_token: acc.accessToken,
                    refresh_token: acc.refreshToken,
                });

                // Refresh token if needed
                try {
                    const tokenInfo = await oauth2Client.getTokenInfo(acc.accessToken).catch(() => null);
                    if (!tokenInfo && acc.refreshToken) {
                        const { credentials } = await oauth2Client.refreshAccessToken();
                        acc.accessToken = credentials.access_token;
                        oauth2Client.setCredentials(credentials);
                        await prisma.gmailAccount.update({
                            where: { id: acc.id },
                            data: { accessToken: acc.accessToken },
                        });
                    }
                } catch (e) {
                    console.error("Token refresh error:", e.message);
                }

                // Gmail API just for email
                const gmail = google.gmail({ version: "v1", auth: oauth2Client });
                const profile = await gmail.users.getProfile({ userId: "me" });

                // Google People API for name & avatar
                const people = google.people({ version: "v1", auth: oauth2Client });
                const me = await people.people.get({
                    resourceName: "people/me",
                    personFields: "names,photos",
                });

                const name = me.data.names?.[0]?.displayName || "";
                const avatar = me.data.photos?.[0]?.url || "";

                return {
                    id: acc.id,
                    email: profile.data.emailAddress,
                    name,
                    avatar,
                };
            })
        );

        return new Response(
            JSON.stringify({ accounts: updatedAccounts }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("Error fetching latest Gmail accounts:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

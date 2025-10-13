// import { google } from "googleapis"
// import { cookies } from "next/headers"

// export async function GET() {
//     const cookieStore = await cookies()
//     let accessToken = cookieStore.get("gmail_access_token")?.value
//     const refreshToken = cookieStore.get("gmail_refresh_token")?.value

//     if (!accessToken && !refreshToken) {
//         return new Response(JSON.stringify({ error: "Not authorized" }), { status: 401 })
//     }

//     const oauth2Client = new google.auth.OAuth2(
//         process.env.GMAIL_CLIENT_ID,
//         process.env.GMAIL_CLIENT_SECRET,
//         process.env.GMAIL_REDIRECT_URI
//     )

//     oauth2Client.setCredentials({
//         access_token: accessToken,
//         refresh_token: refreshToken,
//     })

//     try {
//         // 🔄 refresh if needed
//         const tokenInfo = await oauth2Client.getTokenInfo(accessToken).catch(() => null)
//         if (!tokenInfo && refreshToken) {
//             const { credentials } = await oauth2Client.refreshAccessToken()
//             accessToken = credentials.access_token
//             oauth2Client.setCredentials(credentials)
//             cookieStore.set("gmail_access_token", accessToken, {
//                 httpOnly: true,
//                 path: "/",
//                 maxAge: 3600,
//             })
//         }

//         const gmail = google.gmail({ version: "v1", auth: oauth2Client })

//         const listRes = await gmail.users.messages.list({
//             userId: "me",
//             maxResults: 10,
//             q: "",
//         })

//         const messages = listRes.data.messages || []
//         const detailedMessages = await Promise.all(
//             messages.map(async (msg) => {
//                 const full = await gmail.users.messages.get({
//                     userId: "me",
//                     id: msg.id,
//                     format: "metadata",
//                     metadataHeaders: ["From", "Subject", "Date"],
//                 })

//                 const headers = full.data.payload?.headers || []
//                 const getHeader = (n) => headers.find((h) => h.name === n)?.value || ""

//                 return {
//                     id: msg.id,
//                     snippet: full.data.snippet,
//                     subject: getHeader("Subject"),
//                     from: getHeader("From"),
//                     date: getHeader("Date"),
//                 }
//             })
//         )

//         return Response.json({ messages: detailedMessages })
//     } catch (err) {
//         console.error("Error fetching emails:", err)
//         return new Response(JSON.stringify({ error: err.message }), { status: 500 })
//     }
// }

import { google } from "googleapis"
import { cookies } from "next/headers"


export async function GET(req) {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get("gmail_access_token")?.value;
    const refreshToken = cookieStore.get("gmail_refresh_token")?.value;

    if (!accessToken && !refreshToken) {
        return new Response(JSON.stringify({ error: "Not authorized" }), { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
    );

    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

    try {
        // 🔄 Refresh if needed
        const tokenInfo = await oauth2Client.getTokenInfo(accessToken).catch(() => null);
        if (!tokenInfo && refreshToken) {
            const { credentials } = await oauth2Client.refreshAccessToken();
            accessToken = credentials.access_token;
            oauth2Client.setCredentials(credentials);
            cookieStore.set("gmail_access_token", accessToken, {
                httpOnly: true,
                path: "/",
                maxAge: 3600,
            });
        }

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // get pageToken from query
        const url = new URL(req.url);
        const pageToken = url.searchParams.get("pageToken") || undefined;

        const listRes = await gmail.users.messages.list({
            userId: "me",
            maxResults: 10,
            pageToken, // use pageToken if provided
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

        return Response.json({
            messages: detailedMessages,
            nextPageToken: listRes.data.nextPageToken || null, // return for frontend pagination
        });
    } catch (err) {
        console.error("Error fetching emails:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

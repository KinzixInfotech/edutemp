import { google } from "googleapis"
import { cookies } from "next/headers"

export async function GET() {
    const cookieStore = cookies()
    const accessToken = cookieStore.get("gmail_access_token")?.value

    if (!accessToken) {
        return new Response(JSON.stringify({ error: "Not authorized" }), { status: 401 })
    }

    try {
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({ access_token: accessToken })

        const gmail = google.gmail({ version: "v1", auth: oauth2Client })

        // Fetch message list (limit 10 for example)
        const listRes = await gmail.users.messages.list({
            userId: "me",
            maxResults: 10,
            q: "", // optional search query like "from:someone@example.com"
        })

        const messages = listRes.data.messages || []

        // Fetch details for each message (subject, from, snippet)
        const detailedMessages = await Promise.all(
            messages.map(async (msg) => {
                const full = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id,
                    format: "metadata",
                    metadataHeaders: ["From", "Subject", "Date"],
                })

                const headers = full.data.payload.headers
                const getHeader = (name) => headers.find((h) => h.name === name)?.value || ""

                return {
                    id: msg.id,
                    snippet: full.data.snippet,
                    subject: getHeader("Subject"),
                    from: getHeader("From"),
                    date: getHeader("Date"),
                }
            })
        )

        return Response.json({ messages: detailedMessages })
    } catch (err) {
        console.error("Error fetching emails:", err)
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
}

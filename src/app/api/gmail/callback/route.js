// app/api/gmail/callback/route.js
import { google } from "googleapis"

export async function GET(req) {
    const url = new URL(req.url)
    const code = url.searchParams.get("code")

    if (!code) return new Response("Missing code", { status: 400 })

    const origin = req.headers.get("origin") || `${url.protocol}//${url.host}`
    const redirectUri = `${origin}/api/gmail/callback`

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
    )

    try {
        const { tokens } = await oauth2Client.getToken(code)
        oauth2Client.setCredentials(tokens)

        const gmail = google.gmail({ version: "v1", auth: oauth2Client })
        const profile = await gmail.users.getProfile({ userId: "me" })

        // 👇 only refresh_token is HttpOnly, access_token visible to JS
        const cookies = [
            `gmail_access_token=${tokens.access_token}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax; ${process.env.NODE_ENV === "production" ? "Secure;" : ""
            }`, // <-- no HttpOnly here so JS can read it
            tokens.refresh_token
                ? `gmail_refresh_token=${tokens.refresh_token}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax; HttpOnly; ${process.env.NODE_ENV === "production" ? "Secure;" : ""
                }`
                : "",
            `gmail_user_email=${profile.data.emailAddress}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax;`,
        ].filter(Boolean)

        return new Response(null, {
            status: 302,
            headers: {
                Location: `${origin}/dashboard/schools/mail/inbox`,
                "Set-Cookie": cookies,
            },
        })
    } catch (err) {
        console.error("OAuth callback error:", err)
        return new Response(JSON.stringify({ error: err.message }), { status: 500 })
    }
}

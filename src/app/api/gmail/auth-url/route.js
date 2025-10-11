// import { google } from "googleapis"

// export async function GET() {
//     const oAuth2Client = new google.auth.OAuth2(
//         process.env.GOOGLE_CLIENT_ID,
//         process.env.GOOGLE_CLIENT_SECRET,
//         process.env.GOOGLE_REDIRECT_URI
//     )

//     const scopes = [
//         "https://www.googleapis.com/auth/gmail.readonly",
//         "https://www.googleapis.com/auth/gmail.send",
//     ]

//     const url = oAuth2Client.generateAuthUrl({
//         access_type: "offline",
//         prompt: "consent",
//         scope: scopes,
//     })

//     return Response.json({ url })
// }

import { google } from "googleapis"

export async function GET(req) {
    // Get full origin dynamically
    const origin = req.headers.get("origin") || `${req.url.split("/api")[0]}`

    const redirectUri = `${origin}/api/gmail/callback`

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
    )

    const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
    ]

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: scopes,
    })

    return new Response(JSON.stringify({ url }), {
        headers: { "Content-Type": "application/json" },
    })
}
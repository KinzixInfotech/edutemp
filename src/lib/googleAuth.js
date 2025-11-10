import prisma from "./prisma";


export async function refreshGoogleToken(userId) {
    try {
        const account = await prisma.gmailAccount.findFirst({
            where: { userId },
            orderBy: { lastUsedAt: 'desc' },
        });

        if (!account?.refreshToken) {
            throw new Error('No refresh token found');
        }

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                refresh_token: account.refreshToken,
                grant_type: 'refresh_token',
            }),
        });

        const tokens = await response.json();

        await prisma.gmailAccount.update({
            where: { id: account.id },
            data: {
                accessToken: tokens.access_token,
                lastUsedAt: new Date(),
            },
        });

        return tokens.access_token;
    } catch (error) {
        console.error('Token Refresh Error:', error);
        throw error;
    }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLatestPartner() {
    try {
        const partner = await prisma.partner.findFirst({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                user: true
            }
        });

        if (partner) {
            console.log("Latest Partner Found:");
            console.log("ID:", partner.id);
            console.log("User Email:", partner.user.email);
            console.log("Referral Code:", partner.referralCode);
            console.log("Referral Link:", partner.referralLink);

            if (!partner.referralLink) {
                console.log("⚠️ Referral Link is EMPTY or NULL in the database!");
            } else {
                console.log("✅ Referral Link exists in the database.");
            }
        } else {
            console.log("No partners found in the database.");
        }
    } catch (error) {
        console.error("Error checking partner:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLatestPartner();

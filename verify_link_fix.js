const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNewPartnerLink() {
    try {
        const partner = await prisma.partner.findFirst({
            where: {
                contactEmail: 'link_fix_test@example.com'
            }
        });

        if (partner) {
            console.log("New Partner Found:");
            console.log("Referral Link:", partner.referralLink);

            if (partner.referralLink && !partner.referralLink.includes('undefined')) {
                console.log("✅ Referral Link is CORRECT!");
            } else {
                console.log("❌ Referral Link is still BROKEN!");
            }
        } else {
            console.log("Partner not found.");
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkNewPartnerLink();

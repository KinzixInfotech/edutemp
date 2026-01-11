/**
 * Test Script: Send Push Notification to All Users
 * 
 * Run with: node scripts/test-push-notice.cjs
 */

const { PrismaClient } = require('@prisma/client');
const admin = require('firebase-admin');

require('dotenv').config();

const prisma = new PrismaClient();

// Initialize Firebase Admin (same as your app does)
if (!admin.apps.length) {
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT.trim());
        console.log('Firebase: Initialized from ENV (project_id:', serviceAccount.project_id, ')');
    } else {
        serviceAccount = require('../firebase-admin.json');
        console.log('Firebase: Initialized from local file');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const messaging = admin.messaging();

async function testNoticePush() {
    const schoolId = '4048cc40-d2d8-4e75-8419-41ff2283daf7'; // Your school ID

    console.log('🔔 Test Push Notification Script\n');
    console.log('='.repeat(50));

    // 1. Get all users with FCM tokens
    const usersWithTokens = await prisma.user.findMany({
        where: {
            schoolId,
            fcmToken: { not: null },
            status: 'ACTIVE'
        },
        select: {
            id: true,
            name: true,
            email: true,
            fcmToken: true,
            role: { select: { name: true } }
        }
    });

    console.log(`\n📱 Users with FCM tokens (${usersWithTokens.length}):\n`);

    if (usersWithTokens.length === 0) {
        console.log('❌ No users have FCM tokens registered!');
        console.log('   Users need to login to the mobile app to register their FCM token.\n');

        // Show all users for reference
        const allUsers = await prisma.user.findMany({
            where: { schoolId, status: 'ACTIVE' },
            select: { name: true, email: true, role: { select: { name: true } } },
            take: 10
        });

        console.log('📋 First 10 users in school (without FCM tokens):');
        allUsers.forEach((u, i) => {
            console.log(`   ${i + 1}. ${u.name} (${u.email}) - ${u.role?.name}`);
        });

        return;
    }

    // Show users with tokens
    usersWithTokens.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.name} (${u.email})`);
        console.log(`      Role: ${u.role?.name}`);
        console.log(`      Token: ${u.fcmToken.substring(0, 30)}...`);
        console.log('');
    });

    // 2. Send test notification
    console.log('='.repeat(50));
    console.log('\n🚀 Sending test notification...\n');

    const tokens = usersWithTokens.map(u => u.fcmToken);

    const message = {
        notification: {
            title: '🧪 Test Notice',
            body: 'This is a test push notification from the test script!',
        },
        data: {
            type: 'NEW_NOTICE',
            noticeId: 'test-001',
            category: 'GENERAL',
            priority: 'NORMAL',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
            notification: {
                channelId: 'default',
                priority: 'high',
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                    contentAvailable: true,
                },
            },
        },
        tokens: tokens,
    };

    try {
        const response = await messaging.sendEachForMulticast(message);

        console.log(`✅ Success: ${response.successCount}`);
        console.log(`❌ Failed:  ${response.failureCount}`);

        if (response.failureCount > 0) {
            console.log('\n⚠️  Failed tokens:');
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.log(`   - ${usersWithTokens[idx].name}: ${resp.error?.code || resp.error?.message}`);
                }
            });
        }

        console.log('\n✨ Test complete!');

    } catch (error) {
        console.error('❌ Error sending notification:', error.message);
    }
}

testNoticePush()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

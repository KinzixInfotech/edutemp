const { PrismaClient } = require('@prisma/client');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.log('No email provided. Listing recent users with FCM tokens...');
        try {
            const users = await prisma.user.findMany({
                where: { fcmToken: { not: null } },
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select: { email: true, name: true, role: { select: { name: true } } }
            });

            if (users.length === 0) {
                console.log('No users found with FCM tokens.');
            } else {
                console.log('Found these users with tokens:');
                users.forEach(u => console.log(`- ${u.email} (${u.name}, ${u.role?.name})`));
                console.log('\nUsage: node scripts/test-push-notification.js <email>');
            }
        } catch (e) {
            console.error('Error listing users:', e);
        }
        process.exit(0);
    }

    console.log(`Looking up user with email: ${email}...`);

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, fcmToken: true }
        });

        if (!user) {
            console.error('User not found!');
            process.exit(1);
        }

        if (!user.fcmToken) {
            console.error(`User ${user.name} found, but has NO FCM Token registered.`);
            process.exit(1);
        }

        console.log(`Found User: ${user.name} (${user.id})`);
        console.log(`FCM Token: ${user.fcmToken.substring(0, 20)}...`);

        // Initialize Firebase
        if (!admin.apps.length) {
            let serviceAccount;
            try {
                if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                } else {
                    serviceAccount = require('../firebase-admin.json');
                }

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            } catch (e) {
                console.error('Failed to initialize Firebase Admin:', e.message);
                process.exit(1);
            }
        }

        const messagePayload = {
            token: user.fcmToken,
            notification: {
                title: 'Test Notification',
                body: 'This is a test notification to verify badge increment.',
            },
            data: {
                type: 'GENERAL',
                noticeId: 'test-id',
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
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
                        badge: 1 // Attempt to set badge on iOS explicitly too
                    },
                },
            },
        };

        console.log('Sending notification...');
        const response = await admin.messaging().send(messagePayload);
        console.log('Successfully sent message:', response);
        console.log('Check your device for the notification and badge update.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

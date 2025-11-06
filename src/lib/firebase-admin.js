// // lib/firebase-admin.js
// import admin from 'firebase-admin';

// const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
//   ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
//   : require('../../firebase-admin.json'); // Fallback for local

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// export const messaging = admin.messaging();
// lib/firebase-admin.js
import admin from 'firebase-admin';

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    if (!raw) throw new Error('Empty FIREBASE_SERVICE_ACCOUNT');
    serviceAccount = JSON.parse(raw);
    console.log('Firebase Admin: Initialized from ENV (project_id:', serviceAccount.project_id, ')');
  } else {
    serviceAccount = require('../../firebase-admin.json');
    console.log('Firebase Admin: Initialized from local file (project_id:', serviceAccount.project_id, ')');
  }

  // Validate required fields
  if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Invalid service account: missing project_id, private_key, or client_email');
  }
} catch (error) {
  console.error('FCM Initialization Failed:', error.message);
  throw error; // Crash early — don't proceed with broken FCM
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const messaging = admin.messaging();
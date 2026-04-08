// debug-fcm.js
const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

try {
  let sa;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Loaded Service Account from ENV');
  } else {
    sa = require('./firebase-admin.json');
    console.log('✅ Loaded Service Account from file');
  }

  console.log('Project ID:', sa.project_id);
  console.log('Client Email:', sa.client_email);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(sa)
    });
  }

  console.log('⏳ Attempting to send a dummy message...');

  // Send a dry run message
  admin.messaging().send({
    token: 'fake-device-token-just-testing-auth',
    notification: {
      title: 'Auth Test'
    }
  }, true) // true = dryRun
  .then(response => {
    console.log('✅ Success! Dry run response:', response);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fail!');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    if (error.code === 'messaging/third-party-auth-error') {
      console.error('\n==== DIAGNOSIS ====');
      console.error('The Firebase V1 API is returning an auth error.');
      console.error('Even if the API is "Enabled" in the console, your Service Account (firebase-adminsdk-fbsvc@...)');
      console.error('may not have the "Firebase Cloud Messaging API Admin" role.');
    }
    process.exit(1);
  });

} catch (e) {
  console.error('Fatal initialization error:', e.message);
  process.exit(1);
}

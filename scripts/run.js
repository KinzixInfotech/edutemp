// scripts/generate-firebase-env.js
const fs = require('fs');
const path = require('path');

try {
  const filePath = path.join(__dirname, '../firebase-admin.json');
  const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const envLine = `FIREBASE_SERVICE_ACCOUNT=${JSON.stringify(serviceAccount)}`;
  console.log(envLine);
} catch (err) {
  console.error('Error: Invalid or missing firebase-admin.json');
}
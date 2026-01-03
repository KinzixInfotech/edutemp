// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// ⚠️ TODO: Replace these values with your Firebase Project config
// Must match src/lib/firebaseClient.js
const firebaseConfig = {
    apiKey: "AIzaSyCXYjaZegkUcb6e3E-31yc3ATcT8X-Mfow",
    authDomain: "edubreezy-24c9b.firebaseapp.com",
    projectId: "edubreezy-24c9b",
    storageBucket: "edubreezy-24c9b.firebasestorage.app",
    messagingSenderId: "232222612685",
    appId: "1:232222612685:web:5809f21d1af102a7995d84",
    measurementId: "G-ZMMQE5ELMX"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.png',
        requireInteraction: true, // Keep notification until user interacts
        tag: 'ren-notification' // Group notifications
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

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

    // Handle data-only notifications
    const notificationTitle = payload.notification?.title || payload.data?.title;
    const notificationBody = payload.notification?.body || payload.data?.body;

    const notificationOptions = {
        body: notificationBody,
        icon: '/icon.png',
        image: payload.notification.image, // Support images
        requireInteraction: true, // Keep notification until user interacts
        tag: 'ren-notification', // Group notifications
        data: payload.data || {}
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle Notification Clicks
self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] Notification click received.');
    event.notification.close();

    const urlToOpen = event.notification.data?.actionUrl || event.notification.data?.url || '/dashboard/schools/noticeboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

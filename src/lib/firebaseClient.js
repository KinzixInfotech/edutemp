// src/lib/firebaseClient.js
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

// ⚠️ TODO: Replace these values with your Firebase Project config
// You can find these in Firebase Console > Project Settings > General
const firebaseConfig = {
    apiKey: "AIzaSyCXYjaZegkUcb6e3E-31yc3ATcT8X-Mfow",
    authDomain: "edubreezy-24c9b.firebaseapp.com",
    projectId: "edubreezy-24c9b",
    storageBucket: "edubreezy-24c9b.firebasestorage.app",
    messagingSenderId: "232222612685",
    appId: "1:232222612685:web:5809f21d1af102a7995d84",
    measurementId: "G-ZMMQE5ELMX"
};

let app;
let messaging;

if (typeof window !== "undefined") {
    try {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApps()[0];
        }

        // Initialize messaging
        // Note: We don't wait for isSupported() here because exports need to be synchronous.
        // Components should still check isSupported() before using features.
        try {
            messaging = getMessaging(app);
        } catch (e) {
            console.log("Firebase Messaging not supported in this environment");
        }
    } catch (error) {
        console.error("Firebase Initialization Error:", error);
    }
}

export { app, messaging, getToken, isSupported };

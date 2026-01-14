import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, isSupported } from '@/lib/firebaseClient';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// Roles allowed to receive web push notifications
export const ALLOWED_ROLES = ['ADMIN', 'ACCOUNTANT', 'LIBRARIAN', 'DIRECTOR', 'PRINCIPAL'];

export function useWebPush({ onMessageReceived } = {}) {
    const { fullUser } = useAuth();
    const [permission, setPermission] = useState('default');
    const [token, setToken] = useState(null);
    const router = useRouter();
    useEffect(() => {
        if (!fullUser || !fullUser?.role?.name) return;

        // Check if user role is allowed
        const userRole = fullUser.role.name.toUpperCase();
        if (!ALLOWED_ROLES.includes(userRole)) return;

        // Check current permission status
        if (typeof Notification !== 'undefined') {
            setPermission(Notification.permission);
        }

        const initPush = async () => {
            if (Notification.permission === 'granted') {
                await getAndSaveToken();
            }
        };

        initPush();

    }, [fullUser]);

    const requestForPermission = async () => {
        try {
            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);
            if (permissionResult === 'granted') {
                await getAndSaveToken();
            }
        } catch (error) {
            console.error('Error requesting permission:', error);
        }
    };

    const getAndSaveToken = async () => {
        try {
            const supported = await isSupported();
            if (!supported) {
                console.log('❌ Firebase messaging not supported in this browser');
                return;
            }

            // Ensure service worker is registered for FCM
            let serviceWorkerRegistration;
            if ('serviceWorker' in navigator) {
                serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            }

            const currentToken = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
                serviceWorkerRegistration
            });

            if (currentToken) {
                setToken(currentToken);
                await saveTokenToBackend(fullUser.id, currentToken);
            } else {
                console.log('❌ No registration token available.');
            }
        } catch (error) {
            console.error('❌ Error retrieving token:', error);
        }
    };

    // Listen for foreground messages
    useEffect(() => {
        if (!messaging) {
            console.log('❌ Messaging not initialized');
            return;
        }

        const unsubscribe = onMessage(messaging, (payload) => {
            console.log("🔔 [useWebPush] Foreground Message Received:", payload);
            // Nuclear option to verify reception
            // alert(`Push Received: ${payload.notification?.title || 'No Title'}`);

            // Play sound
            try {

                // Using a reliable CDN for a simple notification sound
                const audio = new Audio('./notify.mp3');
                audio.play().catch(e => console.error("Audio play failed (user interaction needed first?)", e));
            } catch (e) {
                console.error("Audio initialization failed", e);
            }
            toast(payload.notification.title, {
                description: payload.notification.body,
                // action: {
                //     label: "View",
                //     onClick: () => router.push('/dashboard/schools/noticeboard'),
                // },
            });
            if (onMessageReceived) {
                onMessageReceived(payload);
            }
        });
        console.log(' Messaging  initialized');
        return () => unsubscribe();
    }, [onMessageReceived]);

    const saveTokenToBackend = async (userId, token) => {
        try {
            console.log('Saving token to backend for user:', userId, token);
            // Always save token to backend to ensure it's up to date
            const response = await fetch(`/api/users/${userId}/fcm-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fcmToken: token }),
            });

            if (response.ok) {
                localStorage.setItem(`fcm_token_${userId}`, token);
            } else {
                const errorData = await response.json();
                console.error('❌ Failed to save FCM token:', errorData);
            }
        } catch (error) {
            console.error('❌ Error saving FCM token:', error);
        }
    };

    return { permission, token, requestForPermission };
}

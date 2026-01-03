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
            if (!supported) return;

            const currentToken = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY
            });

            if (currentToken) {
                setToken(currentToken);
                await saveTokenToBackend(fullUser.id, currentToken);
            } else {
                console.log('No registration token available.');
            }
        } catch (error) {
            console.error('An error occurred while retrieving token.', error);
        }
    };

    // Listen for foreground messages
    useEffect(() => {
        if (!messaging) return;

        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);

            // Play sound
            try {
                // Using a reliable CDN for a simple notification sound
                const audio = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3');
                audio.play().catch(e => console.error("Audio play failed (user interaction needed first?)", e));
            } catch (e) {
                console.error("Audio initialization failed", e);
            }

            // Custom Professional Toast UI
            // toast.custom((t) => (
            //     <div
            //         className="flex w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-xl overflow-hidden pointer-events-auto ring-1 ring-black/5"
            //         style={{ backdropFilter: 'blur(8px)', opacity: 1 }}
            //     >
            //         <div className="flex-1 w-0 p-4">
            //             <div className="flex items-start gap-4">
            //                 <div className="flex-shrink-0 pt-0.5">
            //                     <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-xl shadow-sm border border-blue-100 dark:border-blue-800/50">
            //                         {payload.notification.icon || '📢'}
            //                     </div>
            //                 </div>
            //                 <div className="flex-1 w-full min-w-0">
            //                     <div className="flex items-center justify-between mb-1">
            //                         <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate pr-2">
            //                             {payload.notification.title}
            //                         </p>
            //                         <span className="text-[10px] items-center bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-500 dark:text-zinc-400 font-medium">
            //                             Just now
            //                         </span>
            //                     </div>
            //                     <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap break-words">
            //                         {payload.notification.body}
            //                     </p>
            //                 </div>
            //             </div>
            //         </div>
            //         <div className="flex flex-col border-l border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50 min-w-[80px]">
            //             <button
            //                 onClick={() => {
            //                     toast.dismiss(t);
            //                     const url = payload.data?.url || payload.data?.actionUrl || payload.fcmOptions?.link || '/dashboard/schools/noticeboard';
            //                     if (url) window.location.href = url;
            //                 }}
            //                 className="flex-1 w-full border-b border-zinc-100 dark:border-zinc-800/50 p-2 flex items-center justify-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
            //             >
            //                 View
            //             </button>
            //             <button
            //                 onClick={() => toast.dismiss(t)}
            //                 className="flex-1 w-full p-2 flex items-center justify-center text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            //             >
            //                 Dismiss
            //             </button>
            //         </div>
            //     </div>
            // ), { duration: 6000, unstyled: true });

            toast(payload.notification.title, {
                description: payload.notification.body,
                action: {
                    label: "View",
                    onClick: () => router.push('/dashboard/schools/noticeboard'),
                },
            });
            if (onMessageReceived) {
                onMessageReceived(payload);
            }
        });

        return () => unsubscribe();
    }, [onMessageReceived]);

    const saveTokenToBackend = async (userId, token) => {
        try {
            // Check if token is already saved in local storage to avoid redundant API calls
            const savedToken = localStorage.getItem(`fcm_token_${userId}`);
            if (savedToken === token) return;

            const response = await fetch(`/api/users/${userId}/fcm-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fcmToken: token }),
            });

            if (response.ok) {
                console.log('FCM token saved to backend');
                localStorage.setItem(`fcm_token_${userId}`, token);
            } else {
                console.error('Failed to save FCM token to backend');
            }
        } catch (error) {
            console.error('Error saving FCM token:', error);
        }
    };

    return { permission, token, requestForPermission };
}

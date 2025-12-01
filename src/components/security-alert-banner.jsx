'use client';

import { useEffect, useRef } from 'react';
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";

export function SecurityAlertBanner() {
    const { user } = useAuth();
    const router = useRouter();
    const hasChecked = useRef(false);

    useEffect(() => {
        if (user && !hasChecked.current) {
            checkSecurityEvents();
            hasChecked.current = true;
        }
    }, [user]);

    const checkSecurityEvents = async () => {
        try {
            const res = await fetch('/api/auth/security-events?unreadOnly=true', {
                headers: { 'x-user-id': user.id }
            });
            const data = await res.json();

            if (res.ok && data.events && data.events.length > 0) {
                const criticalEvents = data.events.filter(e =>
                    e.eventType === 'NEW_LOGIN' || e.eventType === 'SUSPICIOUS_LOGIN'
                );

                if (criticalEvents.length > 0) {
                    const latestAlert = criticalEvents[0];
                    showSecurityToast(latestAlert);
                }
            }
        } catch (error) {
            console.error("Failed to check security events:", error);
        }
    };

    const markAsRead = async (eventId) => {
        try {
            await fetch('/api/auth/security-events', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({
                    eventIds: [eventId]
                })
            });
        } catch (error) {
            console.error("Failed to mark event as read:", error);
        }
    };

    const showSecurityToast = (alert) => {
        toast.custom((t) => (
            <div className="w-full max-w-md bg-background border border-destructive/50 rounded-lg shadow-lg p-4 flex gap-4 dark:bg-zinc-950 dark:border-red-900/50">
                <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-full h-fit">
                    <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-500" />
                </div>
                <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-foreground">New Login Detected</h3>
                    <p className="text-sm text-muted-foreground">
                        From {alert.deviceInfo || 'Unknown Device'} near {alert.location || 'Unknown Location'}.
                    </p>
                    <div className="flex gap-2 mt-3">
                        <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs"
                            onClick={() => {
                                toast.dismiss(t);
                                markAsRead(alert.id);
                                router.push('/dashboard/settings/sessions');
                            }}
                        >
                            Review
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => {
                                toast.dismiss(t);
                                markAsRead(alert.id);
                            }}
                        >
                            Dismiss
                        </Button>
                    </div>
                </div>
            </div>
        ), {
            duration: Infinity, // Persistent until dismissed
            position: 'top-right',
        });
    };

    return null; // No visible component, just logic
}

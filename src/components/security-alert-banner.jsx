'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldAlert, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';

export function SecurityAlertBanner() {
    const { user } = useAuth();
    const router = useRouter();
    const [alerts, setAlerts] = useState([]);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (user) {
            checkSecurityEvents();
        }
    }, [user]);

    const checkSecurityEvents = async () => {
        try {
            // Fetch unread security events
            const res = await fetch('/api/auth/security-events?unreadOnly=true', {
                headers: { 'x-user-id': user.id }
            });
            const data = await res.json();

            if (res.ok && data.events && data.events.length > 0) {
                // Filter for critical events like NEW_LOGIN
                const criticalEvents = data.events.filter(e =>
                    e.eventType === 'NEW_LOGIN' || e.eventType === 'SUSPICIOUS_LOGIN'
                );

                if (criticalEvents.length > 0) {
                    setAlerts(criticalEvents);
                    setVisible(true);
                }
            }
        } catch (error) {
            console.error("Failed to check security events:", error);
        }
    };

    const handleDismiss = async () => {
        setVisible(false);
        // Mark all displayed alerts as read
        try {
            await fetch('/api/auth/security-events', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({
                    eventIds: alerts.map(a => a.id)
                })
            });
        } catch (error) {
            console.error("Failed to mark events as read:", error);
        }
    };

    const handleReview = () => {
        handleDismiss();
        router.push('/dashboard/settings/sessions');
    };

    if (!visible || alerts.length === 0) return null;

    const latestAlert = alerts[0]; // Show the most recent one

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
            <Alert variant="destructive" className="bg-red-50 border-red-200 shadow-lg">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <AlertTitle className="text-red-800 font-semibold ml-2">
                    New Login Detected
                </AlertTitle>
                <AlertDescription className="text-red-700 mt-1 ml-2">
                    <p className="mb-2">
                        We noticed a new login from <strong>{latestAlert.deviceInfo || 'Unknown Device'}</strong> near {latestAlert.location || 'Unknown Location'}.
                    </p>
                    <div className="flex gap-2 mt-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white hover:bg-red-50 border-red-200 text-red-700"
                            onClick={handleReview}
                        >
                            Review Activity
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-700 hover:bg-red-100"
                            onClick={handleDismiss}
                        >
                            Dismiss
                        </Button>
                    </div>
                </AlertDescription>
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                >
                    <X className="h-4 w-4" />
                </button>
            </Alert>
        </div>
    );
}

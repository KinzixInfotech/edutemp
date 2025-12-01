'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Trash2, Smartphone, Monitor, Tablet, Globe, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getDeviceIcon, getBrowserIcon, getOSIcon } from "@/lib/device-info";

export default function SessionsPage() {
    const { user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [revokingId, setRevokingId] = useState(null);

    useEffect(() => {
        if (user) {
            fetchSessions();
        }
    }, [user]);

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/auth/sessions', {
                headers: {
                    'x-user-id': user.id
                }
            });
            const data = await res.json();
            if (res.ok) {
                setSessions(data.sessions);
            }
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
            toast.error("Failed to load sessions");
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async (sessionId) => {
        setRevokingId(sessionId);
        try {
            const res = await fetch(`/api/auth/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'x-user-id': user.id
                }
            });

            if (res.ok) {
                toast.success("Session revoked successfully");
                // Remove from list immediately
                setSessions(prev => prev.filter(s => s.id !== sessionId));
            } else {
                toast.error("Failed to revoke session");
            }
        } catch (error) {
            console.error('Error revoking session:', error);
            toast.error("Error revoking session");
        } finally {
            setRevokingId(null);
        }
    };

    const handleRevokeAll = async () => {
        if (!confirm("Are you sure you want to sign out of all other devices?")) return;

        setLoading(true);
        try {
            // Find current session (the one created most recently or matching current token)
            // For now, we'll just pass the first one as "current" if we can't identify
            // Ideally we'd match the session token, but we might not have it in client

            const res = await fetch('/api/auth/sessions/revoke-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({
                    currentSessionId: sessions[0]?.id // Placeholder logic
                })
            });

            if (res.ok) {
                toast.success("Signed out of all other devices");
                fetchSessions();
            }
        } catch (error) {
            toast.error("Failed to sign out everywhere");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Active Sessions</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage the devices where you are currently logged in.
                    </p>
                </div>
                <Button
                    variant="destructive"
                    onClick={handleRevokeAll}
                    disabled={sessions.length <= 1}
                >
                    Sign Out Everywhere Else
                </Button>
            </div>

            <div className="grid gap-4">
                {sessions.map((session) => (
                    <Card key={session.id} className="overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="p-3 bg-primary/10 rounded-xl h-fit">
                                        {session.deviceType === 'mobile' ? <Smartphone className="w-6 h-6 text-primary" /> :
                                            session.deviceType === 'tablet' ? <Tablet className="w-6 h-6 text-primary" /> :
                                                <Monitor className="w-6 h-6 text-primary" />}
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-lg">
                                                {session.os} {session.osVersion}
                                            </h3>
                                            {/* Logic to detect current session would go here */}
                                            {/* <Badge variant="secondary" className="text-xs">Current Session</Badge> */}
                                        </div>

                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-3 h-3" />
                                                {session.browser} {session.browserVersion}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <ShieldAlert className="w-3 h-3" />
                                                IP: {session.ipAddress || 'Unknown'}
                                            </div>
                                            <div className="text-xs pt-1">
                                                Last active: {new Date(session.lastActiveAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleRevoke(session.id)}
                                    disabled={revokingId === session.id}
                                >
                                    {revokingId === session.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    <span className="sr-only">Revoke</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {sessions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        No active sessions found.
                    </div>
                )}
            </div>
        </div>
    );
}

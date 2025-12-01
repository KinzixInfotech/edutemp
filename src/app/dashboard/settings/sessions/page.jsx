'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Trash2, Smartphone, Monitor, Tablet, Globe, ShieldAlert, Laptop, Clock, MapPin, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

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
        setLoading(true);
        try {
            const res = await fetch('/api/auth/sessions', {
                headers: {
                    'x-user-id': user.id
                }
            });
            const data = await res.json();
            if (res.ok) {
                setSessions(data.sessions);
            } else {
                toast.error("Failed to load sessions");
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
            const res = await fetch('/api/auth/sessions/revoke-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({
                    currentSessionId: sessions[0]?.id
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

    const StatsCard = ({ label, value, icon: Icon, color }) => (
        <Card>
            <CardContent className="p-6 flex items-center justify-between space-y-0">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">{label}</span>
                    <span className="text-2xl font-bold">{value}</span>
                </div>
                <div className={cn("p-3 rounded-full", color)}>
                    <Icon className="w-5 h-5" />
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Active Sessions</h2>
                    <p className="text-muted-foreground mt-1">
                        Manage and monitor your active sessions across different devices
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={fetchSessions} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleRevokeAll}
                        disabled={sessions.length <= 1 || loading}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out Everywhere Else
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                    label="Total Active Sessions"
                    value={sessions.length}
                    icon={Monitor}
                    color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                />
                <StatsCard
                    label="Mobile Devices"
                    value={sessions.filter(s => s.deviceType === 'mobile').length}
                    icon={Smartphone}
                    color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                />
                <StatsCard
                    label="Desktop Devices"
                    value={sessions.filter(s => s.deviceType === 'desktop').length}
                    icon={Laptop}
                    color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                />
            </div>

            <Separator />

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Loading sessions...</p>
                </div>
            ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg border-dashed">
                    <ShieldAlert className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No active sessions found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessions.map((session) => (
                        <Card key={session.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <div className="h-2 bg-gradient-to-r from-primary/50 to-primary" />
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-muted rounded-xl">
                                        {session.deviceType === 'mobile' ? <Smartphone className="w-6 h-6 text-primary" /> :
                                            session.deviceType === 'tablet' ? <Tablet className="w-6 h-6 text-primary" /> :
                                                <Monitor className="w-6 h-6 text-primary" />}
                                    </div>
                                    <Badge variant={session.isCurrent ? "default" : "secondary"}>
                                        {session.isCurrent ? "Current Session" : "Active"}
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            {session.os} {session.osVersion}
                                        </h3>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Globe className="w-3 h-3" />
                                            {session.browser} {session.browserVersion}
                                        </p>
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="w-4 h-4" />
                                            <span>{session.location || 'Unknown Location'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <ShieldAlert className="w-4 h-4" />
                                            <span>IP: {(session.ipAddress === '::1' || session.ipAddress === '127.0.0.1') ? 'Localhost' : (session.ipAddress || 'Unknown')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="w-4 h-4" />
                                            <span>Active: {new Date(session.lastActiveAt).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                                        onClick={() => handleRevoke(session.id)}
                                        disabled={revokingId === session.id}
                                    >
                                        {revokingId === session.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Trash2 className="w-4 h-4 mr-2" />
                                        )}
                                        Revoke Session
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

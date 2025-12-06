'use client';

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Trash2, Smartphone, Monitor, Tablet, Globe, ShieldAlert, Laptop, Clock, MapPin, RefreshCw, LogOut, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SessionsPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [revokingId, setRevokingId] = useState(null);

    // Fetch sessions
    const { data: sessions = [], isLoading, isRefetching } = useQuery({
        queryKey: ['sessions', user?.id],
        queryFn: async () => {
            const res = await fetch('/api/auth/sessions', {
                headers: { 'x-user-id': user?.id }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch sessions');
            return data.sessions;
        },
        enabled: !!user?.id,
        refetchInterval: 30000, // Poll every 30s
        staleTime: 10000,
    });

    // Revoke single session mutation
    const revokeMutation = useMutation({
        mutationFn: async (sessionId) => {
            const res = await fetch(`/api/auth/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': user?.id }
            });
            if (!res.ok) throw new Error('Failed to revoke session');
            return sessionId;
        },
        onMutate: (sessionId) => {
            setRevokingId(sessionId);
        },
        onSuccess: (sessionId) => {
            toast.success("Session revoked successfully");
            queryClient.setQueryData(['sessions', user?.id], (old) =>
                old ? old.filter(s => s.id !== sessionId) : []
            );
        },
        onError: () => {
            toast.error("Failed to revoke session");
        },
        onSettled: () => {
            setRevokingId(null);
            queryClient.invalidateQueries(['sessions', user?.id]);
        }
    });

    // Revoke all mutation
    const revokeAllMutation = useMutation({
        mutationFn: async (currentSessionId) => {
            const res = await fetch('/api/auth/sessions/revoke-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user?.id
                },
                body: JSON.stringify({ currentSessionId })
            });
            if (!res.ok) throw new Error('Failed to sign out everywhere');
        },
        onSuccess: () => {
            toast.success("Signed out of all other devices");
            queryClient.invalidateQueries(['sessions', user?.id]);
        },
        onError: () => {
            toast.error("Failed to sign out everywhere");
        }
    });

    const StatsCard = ({ label, value, icon: Icon, color }) => (
        <Card className="border-0 shadow-sm bg-muted/30">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
                    <span className="text-2xl font-bold tracking-tight">{String(value).padStart(2, '0')}</span>
                </div>
                <div className={cn("p-2.5 rounded-xl bg-white dark:bg-zinc-900 shadow-sm", color)}>
                    <Icon className="w-5 h-5" />
                </div>
            </CardContent>
        </Card>
    );

    const getDeviceIcon = (deviceType) => {
        if (deviceType === 'mobile') return <Smartphone className="w-6 h-6 text-primary" />;
        if (deviceType === 'tablet') return <Tablet className="w-6 h-6 text-primary" />;
        return <Monitor className="w-6 h-6 text-primary" />;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Active Sessions</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage and monitor your active sessions across different devices
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => queryClient.invalidateQueries(['sessions'])}
                        disabled={isRefetching}
                        className={cn("hover:bg-muted", isRefetching && "animate-spin cursor-not-allowed")}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                            const current = sessions.find(s => s.isCurrent)?.id;
                            if (confirm("Are you sure you want to sign out of all other devices? This action cannot be undone.")) {
                                revokeAllMutation.mutate(current);
                            }
                        }}
                        disabled={sessions.length <= 1 || revokeAllMutation.isPending}
                        className="shadow-sm"
                    >
                        {revokeAllMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                        Sign Out Everywhere
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                    label="Total Active"
                    value={sessions.length}
                    icon={Monitor}
                    color="text-blue-500"
                />
                <StatsCard
                    label="Mobile Devices"
                    value={sessions.filter(s => s.deviceType === 'mobile').length}
                    icon={Smartphone}
                    color="text-green-500"
                />
                <StatsCard
                    label="Desktop Devices"
                    value={sessions.filter(s => s.deviceType === 'desktop').length}
                    icon={Laptop}
                    color="text-purple-500"
                />
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                    <p className="text-sm font-medium animate-pulse">Scanning active sessions...</p>
                </div>
            ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                    <ShieldAlert className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No active sessions found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sessions.map((session) => (
                        <Card
                            key={session.id}
                            className={cn(
                                "group overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20",
                                session.isCurrent ? "border-green-500/50 shadow-md ring-1 ring-green-500/20 bg-green-50/10 dark:bg-green-900/10" : "bg-card"
                            )}
                        >
                            <div className={cn("h-1.5 w-full", session.isCurrent ? "bg-green-500" : "bg-zinc-100 dark:bg-zinc-800 group-hover:bg-primary/50 transition-colors")} />
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={cn(
                                        "p-3 rounded-2xl shadow-sm transition-transform group-hover:scale-105",
                                        session.isCurrent ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-muted text-muted-foreground"
                                    )}>
                                        {getDeviceIcon(session.deviceType)}
                                    </div>
                                    {session.isCurrent ? (
                                        <Badge variant="outline" className="bg-green-100/50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 pl-1.5 pr-2.5 py-1 gap-1.5">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                            Current Device
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="px-2.5 py-1">Active</Badge>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                                            {session.deviceName || session.os}
                                        </h3>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1 font-medium">
                                            <Globe className="w-3.5 h-3.5" />
                                            {session.browser} {session.browserVersion}
                                        </p>
                                    </div>

                                    <div className="space-y-3 pt-2 border-t">
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <div className="p-1.5 bg-muted rounded-md"><MapPin className="w-3.5 h-3.5" /></div>
                                            <span className="font-medium text-foreground/80">{session.location || 'Unknown Location'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <div className="p-1.5 bg-muted rounded-md"><ShieldAlert className="w-3.5 h-3.5" /></div>
                                            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{(session.ipAddress === '::1' || session.ipAddress === '127.0.0.1') ? '127.0.0.1 (Localhost)' : (session.ipAddress || 'Unknown IP')}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <div className="p-1.5 bg-muted rounded-md"><Clock className="w-3.5 h-3.5" /></div>
                                            <span>Active since {new Date(session.createdAt || session.lastActiveAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {!session.isCurrent && (
                                        <Button
                                            variant="outline"
                                            className="w-full text-destructive hover:text-white hover:bg-destructive border-destructive/20 hover:border-destructive transition-all duration-200 mt-2"
                                            onClick={() => revokeMutation.mutate(session.id)}
                                            disabled={revokingId === session.id}
                                        >
                                            {revokingId === session.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Trash2 className="w-4 h-4 mr-2" />
                                            )}
                                            Revoke Access
                                        </Button>
                                    )}
                                    {session.isCurrent && (
                                        <div className="w-full py-2.5 text-center text-xs font-medium text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-600/20 mt-2 flex items-center justify-center gap-2">
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            This is your current session
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

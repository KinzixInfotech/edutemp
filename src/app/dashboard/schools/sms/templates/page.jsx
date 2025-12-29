'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Loader2,
    MessageSquare,
    Send,
    CreditCard,
    CheckCircle,
    AlertCircle,
    Eye,
    Info,
    X,
    ShieldAlert,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

const TRAI_NOTICE_DISMISSED_KEY = 'sms_trai_notice_dismissed';

export default function SmsTemplatesPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [isNoticeDismissed, setIsNoticeDismissed] = useState(true); // Default true to prevent flash

    // Check localStorage on mount
    useEffect(() => {
        const dismissed = localStorage.getItem(TRAI_NOTICE_DISMISSED_KEY);
        setIsNoticeDismissed(dismissed === 'true');
    }, []);

    const handleDismissNotice = () => {
        localStorage.setItem(TRAI_NOTICE_DISMISSED_KEY, 'true');
        setIsNoticeDismissed(true);
    };

    // Fetch templates
    const { data: templates, isLoading } = useQuery({
        queryKey: ['sms-templates'],
        queryFn: async () => {
            const res = await fetch('/api/sms/templates');
            if (!res.ok) throw new Error('Failed to fetch templates');
            return res.json();
        },
    });

    // Fetch wallet for stats
    const { data: wallet } = useQuery({
        queryKey: ['sms-wallet', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/sms/wallet`);
            if (!res.ok) throw new Error('Failed to fetch wallet');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch logs for stats
    const { data: logsData } = useQuery({
        queryKey: ['sms-logs', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/sms/logs?limit=5`);
            if (!res.ok) throw new Error('Failed to fetch logs');
            return res.json();
        },
        enabled: !!schoolId,
    });

    if (!schoolId) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* TRAI DLT Notice */}
            {!isNoticeDismissed && (
                <div className="relative bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                                TRAI DLT Compliance Notice
                            </h4>
                            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                                SMS content, templates, and links are governed by TRAI DLT regulations.
                                Only pre-approved templates and verified links are allowed to ensure reliable delivery.
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-amber-600 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-amber-900/50"
                            onClick={handleDismissNotice}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">SMS Templates</h1>
                <p className="text-muted-foreground mt-2">
                    View DLT-compliant templates available for sending SMS
                </p>
            </div>

            <Separator />

            {/* Info Alert */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Pre-approved Templates</AlertTitle>
                <AlertDescription>
                    These templates are registered with DLT and managed by the system administrator.
                    Select any template to use when sending SMS to parents and students.
                </AlertDescription>
            </Alert>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">SMS Credits</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{wallet?.balance?.toFixed(2) || '0.00'}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Total: {wallet?.totalCredits?.toFixed(2) || 0} credits
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Available Templates</CardTitle>
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{templates?.length || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">DLT registered</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">SMS Sent</CardTitle>
                        <Send className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{logsData?.total || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total messages</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Link href="/dashboard/schools/sms/send">
                            <Button variant="default" size="sm" className="w-full justify-start">
                                <Send className="h-4 w-4 mr-2" />
                                Send SMS
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Templates List */}
            <Card>
                <CardHeader>
                    <CardTitle>Available Templates</CardTitle>
                    <CardDescription>
                        Select a template when sending SMS to automatically populate the message
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : templates?.length === 0 ? (
                        <div className="text-center text-muted-foreground py-12">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No templates available yet.</p>
                            <p className="text-sm mt-2">Contact your administrator to add SMS templates.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {templates?.map((template) => (
                                <div
                                    key={template.id}
                                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-semibold">{template.name}</h3>
                                                <Badge variant="secondary" className="text-xs">
                                                    {template.category}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground bg-muted p-2 rounded font-mono">
                                                {template.content.length > 100
                                                    ? `${template.content.slice(0, 100)}...`
                                                    : template.content}
                                            </p>
                                            {template.variables?.length > 0 && (
                                                <div className="flex gap-1 mt-2 flex-wrap">
                                                    {template.variables.map((v) => (
                                                        <Badge
                                                            key={v}
                                                            variant="outline"
                                                            className="text-xs"
                                                        >
                                                            {'{' + v + '}'}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-2">
                                            {template.isActive ? (
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                                            )}
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-lg">
                                                    <DialogHeader>
                                                        <DialogTitle>{template.name}</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Category</p>
                                                            <Badge variant="secondary">{template.category}</Badge>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Message Content</p>
                                                            <div className="bg-muted p-3 rounded mt-1 text-sm font-mono">
                                                                {template.content}
                                                            </div>
                                                        </div>
                                                        {template.variables?.length > 0 && (
                                                            <div>
                                                                <p className="text-sm text-muted-foreground mb-2">Variables</p>
                                                                <div className="flex gap-2 flex-wrap">
                                                                    {template.variables.map((v) => (
                                                                        <Badge key={v} variant="outline">
                                                                            {'{' + v + '}'}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="pt-4">
                                                            <Link href="/dashboard/schools/sms/send">
                                                                <Button className="w-full">
                                                                    <Send className="h-4 w-4 mr-2" />
                                                                    Use This Template
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

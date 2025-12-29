'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
    Loader2,
    Settings,
    Bell,
    Calendar,
    CreditCard,
    AlertTriangle,
    KeyRound,
    Megaphone,
} from 'lucide-react';

const TRIGGER_CONFIG = {
    ATTENDANCE_ABSENT: {
        label: 'Attendance Absent Alert',
        description: 'Send SMS when a student is marked absent',
        icon: Bell,
        color: 'text-orange-500',
    },
    FEE_DUE_REMINDER: {
        label: 'Fee Due Reminder',
        description: 'Send reminder when fee payment is due',
        icon: CreditCard,
        color: 'text-blue-500',
    },
    FEE_OVERDUE: {
        label: 'Fee Overdue Alert',
        description: 'Send alert when fee payment is overdue',
        icon: AlertTriangle,
        color: 'text-red-500',
    },
    OTP_LOGIN: {
        label: 'OTP Login',
        description: 'Send OTP for login verification',
        icon: KeyRound,
        color: 'text-purple-500',
    },
    NOTICE_BROADCAST: {
        label: 'Notice Broadcast',
        description: 'Send notices to parents',
        icon: Megaphone,
        color: 'text-green-500',
    },
    HOLIDAY_ANNOUNCEMENT: {
        label: 'Holiday Announcement',
        description: 'Announce holidays and special events',
        icon: Calendar,
        color: 'text-cyan-500',
    },
};

export default function SmsTriggersPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    // Fetch templates
    const { data: templates } = useQuery({
        queryKey: ['sms-templates'],
        queryFn: async () => {
            const res = await fetch('/api/sms/templates');
            if (!res.ok) throw new Error('Failed to fetch templates');
            return res.json();
        },
    });

    // Fetch triggers
    const { data: triggers, isLoading } = useQuery({
        queryKey: ['sms-triggers', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/sms/triggers`);
            if (!res.ok) throw new Error('Failed to fetch triggers');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Update trigger mutation
    const updateMutation = useMutation({
        mutationFn: async ({ triggerType, isEnabled, templateId }) => {
            const res = await fetch(`/api/schools/${schoolId}/sms/triggers`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ triggerType, isEnabled, templateId }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Update failed');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['sms-triggers', schoolId]);
            toast.success('Trigger updated');
        },
        onError: (error) => toast.error(error.message),
    });

    const handleToggle = (trigger) => {
        if (!trigger.isEnabled && !trigger.templateId) {
            toast.error('Please assign a template first');
            return;
        }
        updateMutation.mutate({
            triggerType: trigger.triggerType,
            isEnabled: !trigger.isEnabled,
            templateId: trigger.templateId,
        });
    };

    const handleTemplateChange = (triggerType, templateId) => {
        const trigger = triggers?.find(t => t.triggerType === triggerType);
        updateMutation.mutate({
            triggerType,
            isEnabled: trigger?.isEnabled || false,
            templateId,
        });
    };

    if (!schoolId) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">SMS Triggers</h1>
                <p className="text-muted-foreground mt-2">
                    Configure automatic SMS notifications for various events
                </p>
            </div>

            <Separator />

            {/* Info Card */}
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <Settings className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-blue-900 dark:text-blue-100">Auto-Trigger Configuration</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                Each trigger requires a DLT-approved template to be assigned before it can be enabled.
                                SMS credits will be deducted automatically when triggers fire.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Triggers List */}
            <Card>
                <CardHeader>
                    <CardTitle>Trigger Settings</CardTitle>
                    <CardDescription>Enable or disable automatic SMS for each event type</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {triggers?.map((trigger) => {
                                const config = TRIGGER_CONFIG[trigger.triggerType] || {
                                    label: trigger.triggerType,
                                    description: '',
                                    icon: Bell,
                                    color: 'text-gray-500',
                                };
                                const Icon = config.icon;

                                return (
                                    <div
                                        key={trigger.triggerType}
                                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-medium">{config.label}</h3>
                                                    <p className="text-sm text-muted-foreground">{config.description}</p>
                                                    {trigger.templateName && (
                                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                            Template: {trigger.templateName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Select
                                                    value={trigger.templateId || 'none'}
                                                    onValueChange={(v) => handleTemplateChange(trigger.triggerType, v === 'none' ? null : v)}
                                                >
                                                    <SelectTrigger className="w-[200px]">
                                                        <SelectValue placeholder="Select template" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">No template</SelectItem>
                                                        {templates?.map((t) => (
                                                            <SelectItem key={t.id} value={t.id}>
                                                                {t.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Switch
                                                    checked={trigger.isEnabled}
                                                    onCheckedChange={() => handleToggle(trigger)}
                                                    disabled={updateMutation.isPending}
                                                />
                                            </div>
                                        </div>
                                        {/* Safety warning */}
                                        <div className="mt-2 ml-14 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                                            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                            <span>When enabled, SMS will be sent automatically to applicable parents and credits will be deducted.</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

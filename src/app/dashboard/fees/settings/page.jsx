'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
    Settings,
    DollarSign,
    CreditCard,
    Bell,
    FileText,
    Percent,
    Calendar,
    Save,
    Loader2,
    Check,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export default function FeeSettings() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    // General Settings State
    const [currency, setCurrency] = useState('INR');
    const [defaultMode, setDefaultMode] = useState('YEARLY');
    const [lateFeeEnabled, setLateFeeEnabled] = useState(true);
    const [lateFeeAmount, setLateFeeAmount] = useState('100');
    const [lateFeeDays, setLateFeeDays] = useState('15');

    // Payment Gateway Settings
    const [razorpayEnabled, setRazorpayEnabled] = useState(false);
    const [razorpayKeyId, setRazorpayKeyId] = useState('');
    const [razorpayKeySecret, setRazorpayKeySecret] = useState('');

    // Notification Settings
    const [emailReminders, setEmailReminders] = useState(true);
    const [smsReminders, setSmsReminders] = useState(false);
    const [reminderDays, setReminderDays] = useState('7');
    const [overdueReminders, setOverdueReminders] = useState(true);

    // Receipt Settings
    const [receiptPrefix, setReceiptPrefix] = useState('REC');
    const [receiptTemplate, setReceiptTemplate] = useState('default');
    const [autoGenerate, setAutoGenerate] = useState(true);

    // Save settings mutation
    const saveSettingsMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/fee/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, schoolId }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error);
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Settings saved successfully');
            queryClient.invalidateQueries(['fee-settings']);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleSaveGeneral = () => {
        saveSettingsMutation.mutate({
            type: 'general',
            settings: {
                currency,
                defaultMode,
                lateFeeEnabled,
                lateFeeAmount: parseFloat(lateFeeAmount),
                lateFeeDays: parseInt(lateFeeDays),
            },
        });
    };

    const handleSavePaymentGateway = () => {
        if (razorpayEnabled && (!razorpayKeyId || !razorpayKeySecret)) {
            toast.error('Please provide Razorpay credentials');
            return;
        }

        saveSettingsMutation.mutate({
            type: 'payment_gateway',
            settings: {
                razorpayEnabled,
                razorpayKeyId,
                razorpayKeySecret,
            },
        });
    };

    const handleSaveNotifications = () => {
        saveSettingsMutation.mutate({
            type: 'notifications',
            settings: {
                emailReminders,
                smsReminders,
                reminderDays: parseInt(reminderDays),
                overdueReminders,
            },
        });
    };

    const handleSaveReceipts = () => {
        saveSettingsMutation.mutate({
            type: 'receipts',
            settings: {
                receiptPrefix,
                receiptTemplate,
                autoGenerate,
            },
        });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                    <Settings className="w-8 h-8 text-gray-600" />
                    Fee Management Settings
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Configure fee collection, payment gateway, and notifications
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="gateway">Payment Gateway</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="receipts">Receipts</TabsTrigger>
                    <TabsTrigger value="discounts">Discounts</TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                General Fee Settings
                            </CardTitle>
                            <CardDescription>Configure basic fee collection settings</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Currency */}
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger className="max-w-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INR">INR - Indian Rupee (₹)</SelectItem>
                                        <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                                        <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Default Fee Mode */}
                            <div className="space-y-2">
                                <Label>Default Fee Mode</Label>
                                <Select value={defaultMode} onValueChange={setDefaultMode}>
                                    <SelectTrigger className="max-w-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                        <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                                        <SelectItem value="YEARLY">Yearly</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Default mode when creating new fee structures
                                </p>
                            </div>

                            {/* Late Fee Settings */}
                            <div className="space-y-4 p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Late Fee</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Charge late fee for overdue payments
                                        </p>
                                    </div>
                                    <Switch
                                        checked={lateFeeEnabled}
                                        onCheckedChange={setLateFeeEnabled}
                                    />
                                </div>

                                {lateFeeEnabled && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Late Fee Amount (₹)</Label>
                                            <Input
                                                type="number"
                                                value={lateFeeAmount}
                                                onChange={(e) => setLateFeeAmount(e.target.value)}
                                                placeholder="100"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Grace Period (Days)</Label>
                                            <Input
                                                type="number"
                                                value={lateFeeDays}
                                                onChange={(e) => setLateFeeDays(e.target.value)}
                                                placeholder="15"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Save Button */}
                            <Button
                                onClick={handleSaveGeneral}
                                disabled={saveSettingsMutation.isPending}
                            >
                                {saveSettingsMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Payment Gateway */}
                <TabsContent value="gateway">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Payment Gateway Configuration
                            </CardTitle>
                            <CardDescription>Setup online payment collection</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Razorpay */}
                            <div className="space-y-4 p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <CreditCard className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <Label className="text-base">Razorpay</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Enable online payment collection via Razorpay
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={razorpayEnabled}
                                        onCheckedChange={setRazorpayEnabled}
                                    />
                                </div>

                                {razorpayEnabled && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="space-y-2">
                                            <Label>Razorpay Key ID *</Label>
                                            <Input
                                                type="text"
                                                value={razorpayKeyId}
                                                onChange={(e) => setRazorpayKeyId(e.target.value)}
                                                placeholder="rzp_test_xxxxxxxxxxxxx"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Razorpay Key Secret *</Label>
                                            <Input
                                                type="password"
                                                value={razorpayKeySecret}
                                                onChange={(e) => setRazorpayKeySecret(e.target.value)}
                                                placeholder="••••••••••••••••"
                                            />
                                        </div>
                                        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                                            <div className="text-sm">
                                                <p className="font-medium text-blue-900">Security Note</p>
                                                <p className="text-blue-700">
                                                    Your Razorpay credentials are encrypted and stored securely
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Test Connection Button */}
                            {razorpayEnabled && razorpayKeyId && razorpayKeySecret && (
                                <Button variant="outline">
                                    <Check className="w-4 h-4 mr-2" />
                                    Test Connection
                                </Button>
                            )}

                            {/* Save Button */}
                            <Button
                                onClick={handleSavePaymentGateway}
                                disabled={saveSettingsMutation.isPending}
                            >
                                {saveSettingsMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications */}
                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="w-5 h-5" />
                                Notification Settings
                            </CardTitle>
                            <CardDescription>Configure automated reminders</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Email Reminders */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label>Email Reminders</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Send email reminders to parents
                                    </p>
                                </div>
                                <Switch
                                    checked={emailReminders}
                                    onCheckedChange={setEmailReminders}
                                />
                            </div>

                            {/* SMS Reminders */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label>SMS Reminders</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Send SMS reminders (requires SMS credits)
                                    </p>
                                </div>
                                <Switch
                                    checked={smsReminders}
                                    onCheckedChange={setSmsReminders}
                                />
                            </div>

                            {/* Reminder Days */}
                            <div className="space-y-2">
                                <Label>Send Reminder Before (Days)</Label>
                                <Select value={reminderDays} onValueChange={setReminderDays}>
                                    <SelectTrigger className="max-w-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="3">3 Days</SelectItem>
                                        <SelectItem value="7">7 Days</SelectItem>
                                        <SelectItem value="14">14 Days</SelectItem>
                                        <SelectItem value="30">30 Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Overdue Reminders */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label>Overdue Reminders</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Send reminders for overdue payments
                                    </p>
                                </div>
                                <Switch
                                    checked={overdueReminders}
                                    onCheckedChange={setOverdueReminders}
                                />
                            </div>

                            {/* Save Button */}
                            <Button
                                onClick={handleSaveNotifications}
                                disabled={saveSettingsMutation.isPending}
                            >
                                {saveSettingsMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Receipts */}
                <TabsContent value="receipts">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Receipt Settings
                            </CardTitle>
                            <CardDescription>Configure payment receipt generation</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Receipt Prefix */}
                            <div className="space-y-2">
                                <Label>Receipt Number Prefix</Label>
                                <Input
                                    value={receiptPrefix}
                                    onChange={(e) => setReceiptPrefix(e.target.value)}
                                    placeholder="REC"
                                    className="max-w-xs"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Example: {receiptPrefix}-2024-001
                                </p>
                            </div>

                            {/* Receipt Template */}
                            <div className="space-y-2">
                                <Label>Receipt Template</Label>
                                <Select value={receiptTemplate} onValueChange={setReceiptTemplate}>
                                    <SelectTrigger className="max-w-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">Default Template</SelectItem>
                                        <SelectItem value="detailed">Detailed Template</SelectItem>
                                        <SelectItem value="minimal">Minimal Template</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Auto Generate */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label>Auto-generate PDF</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Automatically generate PDF receipt after payment
                                    </p>
                                </div>
                                <Switch
                                    checked={autoGenerate}
                                    onCheckedChange={setAutoGenerate}
                                />
                            </div>

                            {/* Save Button */}
                            <Button
                                onClick={handleSaveReceipts}
                                disabled={saveSettingsMutation.isPending}
                            >
                                {saveSettingsMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Discounts */}
                <TabsContent value="discounts">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Percent className="w-5 h-5" />
                                Discount Settings
                            </CardTitle>
                            <CardDescription>Configure discount policies</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="p-4 border rounded-lg">
                                    <h3 className="font-medium mb-2">Sibling Discount</h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Automatic discount for students with siblings
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <Input placeholder="10" className="max-w-[100px]" />
                                        <span className="text-sm">% discount</span>
                                    </div>
                                </div>

                                <div className="p-4 border rounded-lg">
                                    <h3 className="font-medium mb-2">Early Payment Discount</h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Discount for payments before due date
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <Input placeholder="5" className="max-w-[100px]" />
                                        <span className="text-sm">% discount</span>
                                    </div>
                                </div>

                                <Button>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
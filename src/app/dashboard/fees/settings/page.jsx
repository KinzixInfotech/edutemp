'use client';

import { useState, useEffect } from 'react';
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
    AlertCircle,
    Building2,
    Smartphone,
    Globe,
    QrCode,
    Eye,
    EyeOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function FeeSettings() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();
    const [showSecrets, setShowSecrets] = useState(false);

    // ====== STATE FOR ALL SETTINGS ======

    // General Settings
    const [currency, setCurrency] = useState('INR');
    const [defaultMode, setDefaultMode] = useState('YEARLY');
    const [allowPartialPayment, setAllowPartialPayment] = useState(true);
    const [allowAdvancePayment, setAllowAdvancePayment] = useState(true);


    // Late Fee Settings
    const [lateFeeEnabled, setLateFeeEnabled] = useState(false);
    const [lateFeeType, setLateFeeType] = useState('FIXED');
    const [lateFeeAmount, setLateFeeAmount] = useState('0');
    const [lateFeePercentage, setLateFeePercentage] = useState('0');
    const [gracePeriodDays, setGracePeriodDays] = useState('15');
    const [autoApplyLateFee, setAutoApplyLateFee] = useState(false);

    // Online Payment Settings
    const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
    const [paymentGateway, setPaymentGateway] = useState('RAZORPAY');
    const [sandboxMode, setSandboxMode] = useState(true);
    const [razorpayKeyId, setRazorpayKeyId] = useState('');
    const [razorpayKeySecret, setRazorpayKeySecret] = useState('');

    // Bank Details
    const [showBankDetails, setShowBankDetails] = useState(false);
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [branchName, setBranchName] = useState('');
    const [upiId, setUpiId] = useState('');

    // Notification Settings
    const [emailReminders, setEmailReminders] = useState(true);
    const [smsReminders, setSmsReminders] = useState(false);
    const [pushReminders, setPushReminders] = useState(false);
    const [reminderDays, setReminderDays] = useState('7');
    const [overdueReminders, setOverdueReminders] = useState(true);

    // Receipt Settings
    const [receiptPrefix, setReceiptPrefix] = useState('REC');
    const [receiptTemplate, setReceiptTemplate] = useState('default');
    const [autoGenerate, setAutoGenerate] = useState(true);
    const [showSchoolLogo, setShowSchoolLogo] = useState(true);
    const [receiptFooterText, setReceiptFooterText] = useState('');

    // Discount Settings
    const [siblingDiscountEnabled, setSiblingDiscountEnabled] = useState(false);
    const [siblingDiscountPercentage, setSiblingDiscountPercentage] = useState('0');
    const [earlyPaymentDiscountEnabled, setEarlyPaymentDiscountEnabled] = useState(false);
    const [earlyPaymentDiscountPercentage, setEarlyPaymentDiscountPercentage] = useState('0');
    const [earlyPaymentDays, setEarlyPaymentDays] = useState('10');
    const [staffWardDiscountEnabled, setStaffWardDiscountEnabled] = useState(false);
    const [staffWardDiscountPercentage, setStaffWardDiscountPercentage] = useState('0');

    // Onboarding form state (kept at parent level to persist across tabs)
    const [showOnboardingForm, setShowOnboardingForm] = useState(false);

    // ====== FETCH SETTINGS ======
    const { data: settingsData, isLoading } = useQuery({
        queryKey: ['fee-settings', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/fee/settings?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Populate state when settings load
    useEffect(() => {
        if (settingsData?.settings) {
            const s = settingsData.settings;
            // General
            setCurrency(s.currency || 'INR');
            setDefaultMode(s.defaultFeeMode || 'YEARLY');
            setAllowPartialPayment(s.allowPartialPayment ?? true);
            setAllowAdvancePayment(s.allowAdvancePayment ?? true);

            // Late Fee
            setLateFeeEnabled(s.lateFeeEnabled ?? false);
            setLateFeeType(s.lateFeeType || 'FIXED');
            setLateFeeAmount(String(s.lateFeeAmount || 0));
            setLateFeePercentage(String(s.lateFeePercentage || 0));
            setGracePeriodDays(String(s.gracePeriodDays || 15));
            setAutoApplyLateFee(s.autoApplyLateFee ?? false);
            // Online Payments
            setOnlinePaymentEnabled(s.onlinePaymentEnabled ?? false);
            setPaymentGateway(s.paymentGateway || 'RAZORPAY');
            setSandboxMode(s.sandboxMode ?? true);
            setRazorpayKeyId(s.razorpayKeyId || '');
            setRazorpayKeySecret(s.razorpayKeySecret || '');
            // Bank Details
            setShowBankDetails(s.showBankDetails ?? false);
            setBankName(s.bankName || '');
            setAccountNumber(s.accountNumber || '');
            setIfscCode(s.ifscCode || '');
            setAccountHolderName(s.accountHolderName || '');
            setBranchName(s.branchName || '');
            setUpiId(s.upiId || '');
            // Notifications
            setEmailReminders(s.emailReminders ?? true);
            setSmsReminders(s.smsReminders ?? false);
            setPushReminders(s.pushReminders ?? false);
            setReminderDays(String(s.reminderDaysBefore || 7));
            setOverdueReminders(s.overdueReminders ?? true);
            // Receipts
            setReceiptPrefix(s.receiptPrefix || 'REC');
            setReceiptTemplate(s.receiptTemplate || 'default');
            setAutoGenerate(s.autoGenerateReceipt ?? true);
            setShowSchoolLogo(s.showSchoolLogo ?? true);
            setReceiptFooterText(s.receiptFooterText || '');
            // Discounts
            setSiblingDiscountEnabled(s.siblingDiscountEnabled ?? false);
            setSiblingDiscountPercentage(String(s.siblingDiscountPercentage || 0));
            setEarlyPaymentDiscountEnabled(s.earlyPaymentDiscountEnabled ?? false);
            setEarlyPaymentDiscountPercentage(String(s.earlyPaymentDiscountPercentage || 0));
            setEarlyPaymentDays(String(s.earlyPaymentDays || 10));
            setStaffWardDiscountEnabled(s.staffWardDiscountEnabled ?? false);
            setStaffWardDiscountPercentage(String(s.staffWardDiscountPercentage || 0));
        }
    }, [settingsData]);

    // ====== SAVE MUTATION ======
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

    // ====== SAVE HANDLERS ======
    const handleSaveGeneral = () => {
        saveSettingsMutation.mutate({
            type: 'general',
            settings: {
                currency,
                defaultMode,
                allowPartialPayment,
                allowAdvancePayment,

                lateFeeEnabled,
                lateFeeType,
                lateFeeAmount: parseFloat(lateFeeAmount),
                lateFeePercentage: parseFloat(lateFeePercentage),
                lateFeeDays: parseInt(gracePeriodDays),
                autoApplyLateFee,
            },
        });
    };

    const handleSavePaymentGateway = () => {
        saveSettingsMutation.mutate({
            type: 'payment_gateway',
            settings: {
                onlinePaymentEnabled,
                paymentGateway: 'RAZORPAY', // Always Razorpay Route
            },
        });
    };

    const handleSaveBankDetails = () => {
        saveSettingsMutation.mutate({
            type: 'bank_details',
            settings: {
                showBankDetails,
                bankName,
                accountNumber,
                ifscCode,
                accountHolderName,
                branchName,
                upiId,
            },
        });
    };

    const handleSaveNotifications = () => {
        saveSettingsMutation.mutate({
            type: 'notifications',
            settings: {
                emailReminders,
                smsReminders,
                pushReminders,
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
                showSchoolLogo,
                receiptFooterText,
            },
        });
    };

    const handleSaveDiscounts = () => {
        saveSettingsMutation.mutate({
            type: 'discounts',
            settings: {
                siblingDiscountEnabled,
                siblingDiscountPercentage: parseFloat(siblingDiscountPercentage),
                earlyPaymentDiscountEnabled,
                earlyPaymentDiscountPercentage: parseFloat(earlyPaymentDiscountPercentage),
                earlyPaymentDays: parseInt(earlyPaymentDays),
                staffWardDiscountEnabled,
                staffWardDiscountPercentage: parseFloat(staffWardDiscountPercentage),
            },
        });
    };

    // Onboarding Status Card Component
    const OnboardingStatusCard = ({ schoolId, showForm, setShowForm }) => {
        const [formData, setFormData] = useState({
            businessName: '',
            businessType: 'educational_institution',
            contactName: '',
            contactEmail: '',
            contactPhone: '',
            bankAccountName: '',
            bankAccountNumber: '',
            bankIfscCode: '',
            bankName: '',
        });

        const { data: onboardingData, isLoading: onboardingLoading, refetch } = useQuery({
            queryKey: ['razorpay-onboarding', schoolId],
            queryFn: async () => {
                const res = await fetch(`/api/razorpay/onboard/status?schoolId=${schoolId}`);
                if (!res.ok) return { status: 'NOT_STARTED', canAcceptPayments: false };
                return res.json();
            },
            enabled: !!schoolId,
            refetchInterval: 30000,
        });

        const startOnboardingMutation = useMutation({
            mutationFn: async () => {
                const createRes = await fetch('/api/razorpay/onboard/create-account', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        schoolId,
                        email: formData.contactEmail,
                        phone: formData.contactPhone,
                        businessType: formData.businessType,
                        contactName: formData.contactName,
                    }),
                });
                if (!createRes.ok) {
                    const err = await createRes.json();
                    throw new Error(err.error || 'Failed to create account');
                }

                const kycRes = await fetch('/api/razorpay/onboard/submit-kyc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        schoolId,
                        stakeholder: {
                            name: formData.contactName,
                            email: formData.contactEmail,
                            phone: formData.contactPhone,
                        },
                        bankDetails: {
                            accountName: formData.bankAccountName,
                            accountNumber: formData.bankAccountNumber,
                            ifsc: formData.bankIfscCode,
                            bankName: formData.bankName,
                        },
                    }),
                });
                if (!kycRes.ok) {
                    const err = await kycRes.json();
                    throw new Error(err.error || 'Failed to submit KYC');
                }
                return kycRes.json();
            },
            onSuccess: () => {
                toast.success('Onboarding submitted! KYC verification takes 1-2 business days.');
                setShowForm(false);
                refetch();
            },
            onError: (error) => {
                toast.error(error.message);
            },
        });

        if (onboardingLoading) {
            return <div className="p-4 border rounded-lg animate-pulse bg-gray-100 dark:bg-gray-800 h-40" />;
        }

        const status = onboardingData?.status || 'NOT_STARTED';
        const canAccept = onboardingData?.canAcceptPayments;

        const steps = [
            { key: 'CREATED', label: 'Account Created', done: ['CREATED', 'KYC_SUBMITTED', 'KYC_VERIFIED', 'PAYMENTS_ENABLED'].includes(status) },
            { key: 'KYC_SUBMITTED', label: 'KYC Submitted', done: ['KYC_SUBMITTED', 'KYC_VERIFIED', 'PAYMENTS_ENABLED'].includes(status) },
            { key: 'KYC_VERIFIED', label: 'KYC Verified', done: ['KYC_VERIFIED', 'PAYMENTS_ENABLED'].includes(status) },
            { key: 'PAYMENTS_ENABLED', label: 'Payments Enabled', done: status === 'PAYMENTS_ENABLED' },
        ];

        return (
            <div className="border rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                    <h4 className="font-medium">Payment Account Status</h4>
                    {canAccept ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Active</Badge>
                    ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">Setup Required</Badge>
                    )}
                </div>

                <div className="p-4 space-y-4">
                    {/* Stepper */}
                    <div className="flex items-start">
                        {steps.map((step, idx) => (
                            <div key={step.key} className="flex-1 flex flex-col items-center">
                                <div className="flex items-center w-full">
                                    {idx > 0 && (
                                        <div className={`flex-1 h-1 ${steps[idx - 1].done ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                    )}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 ${step.done
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : 'bg-white dark:bg-gray-900 border-gray-300 text-gray-400'
                                        }`}>
                                        {step.done ? <Check className="w-5 h-5" /> : idx + 1}
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={`flex-1 h-1 ${step.done ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground mt-2 text-center px-1">{step.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Not Started - Show Button */}
                    {status === 'NOT_STARTED' && !showForm && (
                        <div className="text-center py-4 border-t">
                            <p className="text-sm text-muted-foreground mb-4">
                                Complete onboarding to start accepting online payments
                            </p>
                            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                                <CreditCard className="w-4 h-4 mr-2" />
                                Start Onboarding
                            </Button>
                        </div>
                    )}

                    {/* Onboarding Form */}
                    {showForm && (
                        <div className="space-y-4 pt-4 border-t">
                            <h5 className="font-medium">Business & Bank Details</h5>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Business Name *</Label>
                                    <Input
                                        value={formData.businessName}
                                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                        placeholder="Your School Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Business Type</Label>
                                    <Select value={formData.businessType} onValueChange={(v) => setFormData({ ...formData, businessType: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="educational_institution">Educational Institution</SelectItem>
                                            <SelectItem value="trust">Trust</SelectItem>
                                            <SelectItem value="society">Society</SelectItem>
                                            <SelectItem value="private_limited">Private Limited</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Contact Name *</Label>
                                    <Input
                                        value={formData.contactName}
                                        onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                        placeholder="Principal Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Contact Email *</Label>
                                    <Input
                                        type="email"
                                        value={formData.contactEmail}
                                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                        placeholder="school@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Contact Phone *</Label>
                                    <Input
                                        value={formData.contactPhone}
                                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                        placeholder="9876543210"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 border-t">
                                <h6 className="text-sm font-medium mb-3">Bank Account for Settlement</h6>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Account Holder Name *</Label>
                                        <Input
                                            value={formData.bankAccountName}
                                            onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                                            placeholder="School Trust Name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Bank Name *</Label>
                                        <Input
                                            value={formData.bankName}
                                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                            placeholder="State Bank of India"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Account Number *</Label>
                                        <Input
                                            value={formData.bankAccountNumber}
                                            onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                                            placeholder="1234567890"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>IFSC Code *</Label>
                                        <Input
                                            value={formData.bankIfscCode}
                                            onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value.toUpperCase() })}
                                            placeholder="SBIN0001234"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    onClick={() => startOnboardingMutation.mutate()}
                                    disabled={startOnboardingMutation.isPending || !formData.contactEmail || !formData.bankAccountNumber}
                                >
                                    {startOnboardingMutation.isPending ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                                    ) : (
                                        <><Check className="w-4 h-4 mr-2" />Submit for Verification</>
                                    )}
                                </Button>
                                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                            </div>
                        </div>
                    )}

                    {/* KYC Submitted */}
                    {status === 'KYC_SUBMITTED' && (
                        <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200">
                            <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
                            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                                <strong>KYC Under Review</strong> - Verification takes 1-2 business days.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Rejected */}
                    {status === 'REJECTED' && (
                        <Alert className="bg-red-50 dark:bg-red-950 border-red-200">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <AlertDescription className="text-red-700">
                                <strong>KYC Rejected:</strong> {onboardingData?.error || 'Contact support'}
                                <Button variant="outline" size="sm" className="mt-2 ml-2" onClick={() => setShowForm(true)}>Retry</Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Active */}
                    {canAccept && (
                        <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
                            <Check className="w-4 h-4 text-green-600" />
                            <AlertDescription className="text-green-700">
                                <strong>Ready!</strong> Parents can now pay fees online.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Fee Breakdown */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                        <h5 className="text-sm font-medium">Transaction Fee Breakdown</h5>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Razorpay Charge</span>
                                <span className="font-medium">2%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Platform Fee</span>
                                <span className="font-medium">1%</span>
                            </div>
                            <div className="pt-2 border-t flex justify-between">
                                <span className="font-medium">Total</span>
                                <span className="font-bold text-orange-600">3%</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">₹10,000 → ₹9,700 to school</p>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                    <Settings className="w-8 h-8 text-gray-600" />
                    Fee Management Settings
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Configure fee collection, payments, bank details, and notifications
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-4">
                <TabsList className="grid bg-muted/20 grid-cols-2 lg:grid-cols-5 gap-1">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="receipts">Receipts</TabsTrigger>
                    <TabsTrigger value="discounts">Discounts</TabsTrigger>
                </TabsList>

                {/* ====== GENERAL SETTINGS ====== */}
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Currency */}
                                <div className="space-y-2">
                                    <Label>Currency</Label>
                                    <Select value={currency} onValueChange={setCurrency}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="INR">INR - Indian Rupee (₹)</SelectItem>
                                            <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                                            <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                                            <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Default Fee Mode */}
                                <div className="space-y-2">
                                    <Label>Default Fee Mode</Label>
                                    <Select value={defaultMode} onValueChange={setDefaultMode}>
                                        <SelectTrigger>
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
                                        Default when creating new fee structures
                                    </p>
                                </div>
                            </div>

                            {/* Payment Flexibility */}
                            <div className="space-y-4 p-4 border rounded-lg">
                                <h3 className="font-medium">Payment Flexibility</h3>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Allow Partial Payments</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Students can pay part of an installment
                                        </p>
                                    </div>
                                    <Switch checked={allowPartialPayment} onCheckedChange={setAllowPartialPayment} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Allow Advance Payments</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Students can pay for future installments
                                        </p>
                                    </div>
                                    <Switch checked={allowAdvancePayment} onCheckedChange={setAllowAdvancePayment} />
                                </div>


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
                                    <Switch checked={lateFeeEnabled} onCheckedChange={setLateFeeEnabled} />
                                </div>

                                {lateFeeEnabled && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Late Fee Type</Label>
                                                <Select value={lateFeeType} onValueChange={setLateFeeType}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="FIXED">Fixed Amount</SelectItem>
                                                        <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {lateFeeType === 'FIXED' ? (
                                                <div className="space-y-2">
                                                    <Label>Late Fee Amount (₹)</Label>
                                                    <Input
                                                        type="number"
                                                        value={lateFeeAmount}
                                                        onChange={(e) => setLateFeeAmount(e.target.value)}
                                                        placeholder="100"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Label>Late Fee Percentage (%)</Label>
                                                    <Input
                                                        type="number"
                                                        value={lateFeePercentage}
                                                        onChange={(e) => setLateFeePercentage(e.target.value)}
                                                        placeholder="5"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Grace Period (Days)</Label>
                                                <Input
                                                    type="number"
                                                    value={gracePeriodDays}
                                                    onChange={(e) => setGracePeriodDays(e.target.value)}
                                                    placeholder="15"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                                <div>
                                                    <Label className="text-sm">Auto-apply Late Fee</Label>
                                                    <p className="text-xs text-muted-foreground">Automatically add late fee</p>
                                                </div>
                                                <Switch checked={autoApplyLateFee} onCheckedChange={setAutoApplyLateFee} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button onClick={handleSaveGeneral} disabled={saveSettingsMutation.isPending}>
                                {saveSettingsMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                                ) : (
                                    <><Save className="w-4 h-4 mr-2" />Save Changes</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ====== PAYMENT GATEWAY (RAZORPAY ROUTE) ====== */}
                <TabsContent value="payments">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="w-5 h-5" />
                                Online Payment Settings
                            </CardTitle>
                            <CardDescription>
                                Enable online payments via Razorpay. Payments go directly to your school's bank account.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Enable Online Payments Toggle */}
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                        <CreditCard className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <Label className="text-base font-medium">Enable Online Payments</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Allow students/parents to pay fees online
                                        </p>
                                    </div>
                                </div>
                                <Switch checked={onlinePaymentEnabled} onCheckedChange={setOnlinePaymentEnabled} />
                            </div>

                            {onlinePaymentEnabled && (
                                <>
                                    {/* Platform Info */}
                                    <Alert className="bg-green-50 dark:bg-green-950 border-green-200">
                                        <Check className="w-4 h-4 text-green-600" />
                                        <AlertDescription className="text-green-700 dark:text-green-300">
                                            <strong>Powered by Razorpay Route</strong>
                                            <p className="text-sm mt-1">
                                                Payments are processed securely through EduBreezy's platform. Funds are settled directly to your registered bank account.
                                            </p>
                                        </AlertDescription>
                                    </Alert>

                                    {/* Onboarding Status - Would be fetched from API */}
                                    <OnboardingStatusCard schoolId={schoolId} showForm={showOnboardingForm} setShowForm={setShowOnboardingForm} />

                                    {/* How it works */}
                                    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                                        <h4 className="font-medium mb-3">How it works:</h4>
                                        <ol className="text-sm text-muted-foreground space-y-2">
                                            <li className="flex items-start gap-2">
                                                <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">1</span>
                                                Parent initiates payment from the payment portal
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">2</span>
                                                Payment is processed securely via Razorpay
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="w-5 h-5 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">3</span>
                                                Funds are settled to your bank account (T+2 days)
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="w-5 h-5 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center text-xs font-medium text-orange-600">4</span>
                                                <div>
                                                    <span className="font-medium text-foreground">3% fee deducted</span>
                                                    <span className="text-xs ml-1">(2% Razorpay + 1% Platform)</span>
                                                </div>
                                            </li>
                                        </ol>
                                    </div>
                                </>
                            )}

                            <Button onClick={handleSavePaymentGateway} disabled={saveSettingsMutation.isPending}>
                                {saveSettingsMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                                ) : (
                                    <><Save className="w-4 h-4 mr-2" />Save Changes</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>


                {/* ====== NOTIFICATIONS ====== */}
                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="w-5 h-5" />
                                Notification Settings
                            </CardTitle>
                            <CardDescription>Configure automated fee reminders</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Email Reminders */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label>Email Reminders</Label>
                                    <p className="text-xs text-muted-foreground">Send email reminders to parents</p>
                                </div>
                                <Switch checked={emailReminders} onCheckedChange={setEmailReminders} />
                            </div>

                            {/* SMS Reminders */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label>SMS Reminders</Label>
                                    <p className="text-xs text-muted-foreground">Send SMS reminders (requires SMS credits)</p>
                                </div>
                                <Switch checked={smsReminders} onCheckedChange={setSmsReminders} />
                            </div>

                            {/* Push Notifications */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label>Push Notifications</Label>
                                    <p className="text-xs text-muted-foreground">Send app push notifications</p>
                                </div>
                                <Switch checked={pushReminders} onCheckedChange={setPushReminders} />
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
                                    <p className="text-xs text-muted-foreground">Send reminders for overdue payments</p>
                                </div>
                                <Switch checked={overdueReminders} onCheckedChange={setOverdueReminders} />
                            </div>

                            <Button onClick={handleSaveNotifications} disabled={saveSettingsMutation.isPending}>
                                {saveSettingsMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                                ) : (
                                    <><Save className="w-4 h-4 mr-2" />Save Changes</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ====== RECEIPTS ====== */}
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
                                    onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
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
                                <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} />
                            </div>

                            {/* Show School Logo */}
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label>Show School Logo</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Display school logo on receipts
                                    </p>
                                </div>
                                <Switch checked={showSchoolLogo} onCheckedChange={setShowSchoolLogo} />
                            </div>

                            {/* Footer Text */}
                            <div className="space-y-2">
                                <Label>Receipt Footer Text</Label>
                                <Textarea
                                    value={receiptFooterText}
                                    onChange={(e) => setReceiptFooterText(e.target.value)}
                                    placeholder="e.g., Thank you for your payment. This is a computer-generated receipt."
                                    rows={3}
                                />
                            </div>

                            <Button onClick={handleSaveReceipts} disabled={saveSettingsMutation.isPending}>
                                {saveSettingsMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                                ) : (
                                    <><Save className="w-4 h-4 mr-2" />Save Changes</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ====== DISCOUNTS ====== */}
                <TabsContent value="discounts">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Percent className="w-5 h-5" />
                                Discount Settings
                            </CardTitle>
                            <CardDescription>Configure automatic discount policies</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Sibling Discount */}
                            <div className="space-y-4 p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Sibling Discount</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Automatic discount for students with siblings
                                        </p>
                                    </div>
                                    <Switch checked={siblingDiscountEnabled} onCheckedChange={setSiblingDiscountEnabled} />
                                </div>
                                {siblingDiscountEnabled && (
                                    <div className="flex items-center gap-4">
                                        <Input
                                            type="number"
                                            value={siblingDiscountPercentage}
                                            onChange={(e) => setSiblingDiscountPercentage(e.target.value)}
                                            className="max-w-[100px]"
                                        />
                                        <span className="text-sm">% discount</span>
                                    </div>
                                )}
                            </div>

                            {/* Early Payment Discount */}
                            <div className="space-y-4 p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Early Payment Discount</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Discount for payments before due date
                                        </p>
                                    </div>
                                    <Switch checked={earlyPaymentDiscountEnabled} onCheckedChange={setEarlyPaymentDiscountEnabled} />
                                </div>
                                {earlyPaymentDiscountEnabled && (
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <Input
                                            type="number"
                                            value={earlyPaymentDiscountPercentage}
                                            onChange={(e) => setEarlyPaymentDiscountPercentage(e.target.value)}
                                            className="max-w-[100px]"
                                        />
                                        <span className="text-sm">% discount if paid</span>
                                        <Input
                                            type="number"
                                            value={earlyPaymentDays}
                                            onChange={(e) => setEarlyPaymentDays(e.target.value)}
                                            className="max-w-[80px]"
                                        />
                                        <span className="text-sm">days before due date</span>
                                    </div>
                                )}
                            </div>

                            {/* Staff Ward Discount */}
                            <div className="space-y-4 p-4 border rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Staff Ward Discount</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Discount for children of school staff
                                        </p>
                                    </div>
                                    <Switch checked={staffWardDiscountEnabled} onCheckedChange={setStaffWardDiscountEnabled} />
                                </div>
                                {staffWardDiscountEnabled && (
                                    <div className="flex items-center gap-4">
                                        <Input
                                            type="number"
                                            value={staffWardDiscountPercentage}
                                            onChange={(e) => setStaffWardDiscountPercentage(e.target.value)}
                                            className="max-w-[100px]"
                                        />
                                        <span className="text-sm">% discount</span>
                                    </div>
                                )}
                            </div>

                            <Button onClick={handleSaveDiscounts} disabled={saveSettingsMutation.isPending}>
                                {saveSettingsMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                                ) : (
                                    <><Save className="w-4 h-4 mr-2" />Save Changes</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
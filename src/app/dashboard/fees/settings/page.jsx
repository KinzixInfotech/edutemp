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
    EyeOff,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    HelpCircle,
    ChevronRight
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
import ReceiptPreview from '@/components/receipts/ReceiptPreview';
import FeeStatementTemplate from '@/components/receipts/FeeStatementTemplate';
import FileUploadButton from '@/components/fileupload';
import { useUploadThing } from '@/lib/uploadthing';
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
    const [testMode, setTestMode] = useState(true); // Default to test mode
    const [paymentGateway, setPaymentGateway] = useState('ICICI_EAZYPAY');
    const [merchantId, setMerchantId] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [workingKey, setWorkingKey] = useState('');
    const [successUrl, setSuccessUrl] = useState('');
    const [failureUrl, setFailureUrl] = useState('');

    // Verification State
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null); // 'success', 'error', null

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
    const [customReceiptLogo, setCustomReceiptLogo] = useState(''); // Custom logo URL or uploaded image
    const [customReceiptEmail, setCustomReceiptEmail] = useState(''); // Custom email for receipts
    const [customReceiptPhone, setCustomReceiptPhone] = useState(''); // Custom phone for receipts

    // Discount Settings
    const [siblingDiscountEnabled, setSiblingDiscountEnabled] = useState(false);
    const [siblingDiscountPercentage, setSiblingDiscountPercentage] = useState('0');
    const [earlyPaymentDiscountEnabled, setEarlyPaymentDiscountEnabled] = useState(false);
    const [earlyPaymentDiscountPercentage, setEarlyPaymentDiscountPercentage] = useState('0');
    const [earlyPaymentDays, setEarlyPaymentDays] = useState('10');
    const [earlyPaymentDaysMonthly, setEarlyPaymentDaysMonthly] = useState(7);
    const [earlyPaymentDaysQuarterly, setEarlyPaymentDaysQuarterly] = useState(15);
    const [earlyPaymentDaysHalfYearly, setEarlyPaymentDaysHalfYearly] = useState(30);
    // const [earlyPaymentDaysHalfYearly, setEarlyPaymentDaysHalfYearly] = useState(30);
    const [earlyPaymentDaysYearly, setEarlyPaymentDaysYearly] = useState(60);

    const [previewType, setPreviewType] = useState('receipt'); // 'receipt' or 'statement'
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
            setTestMode(s.testMode ?? true);
            setPaymentGateway(s.paymentGateway === 'MANUAL' ? 'ICICI_EAZYPAY' : (s.paymentGateway || 'ICICI_EAZYPAY'));
            setMerchantId(s.merchantId || '');
            setAccessCode(s.accessCode || '');
            setSecretKey(s.secretKey || '');
            setWorkingKey(s.workingKey || '');
            setSuccessUrl(s.successUrl || '');
            setFailureUrl(s.failureUrl || '');
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
            setEarlyPaymentDaysMonthly(s.earlyPaymentDaysMonthly || 7);
            setEarlyPaymentDaysQuarterly(s.earlyPaymentDaysQuarterly || 15);
            setEarlyPaymentDaysHalfYearly(s.earlyPaymentDaysHalfYearly || 30);
            setEarlyPaymentDaysYearly(s.earlyPaymentDaysYearly || 60);
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
            setVerificationStatus(null);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // ====== SAVE HANDLERS ======
    // ====== VERIFY MUTATION ======
    const verifyGatewayMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/payment/verify-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: paymentGateway,
                    merchantId,
                    accessCode,
                    secretKey,
                    workingKey
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Verification failed');
            return data;
        },
        onMutate: () => setIsVerifying(true),
        onSettled: () => setIsVerifying(false),
        onSuccess: (data) => {
            if (data.valid) {
                setVerificationStatus('success');
                toast.success('Gateway configuration verified successfully!');
            } else {
                setVerificationStatus('error');
                toast.error(`Verification Failed: ${data.message}`);
            }
        },
        onError: (err) => {
            setVerificationStatus('error');
            toast.error(err.message);
        }
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
                testMode,
                paymentGateway,
                merchantId,
                accessCode,
                secretKey,
                workingKey,
                successUrl,
                failureUrl,
            },
        });
    };

    // Helper: Determine visible fields
    const getGatewayFields = (provider) => {
        switch (provider) {
            case 'ICICI_EAZYPAY':
                return {
                    merchantId: true, secretKey: true, accessCode: false, workingKey: false,
                    labels: { merchantId: 'Merchant ID (Provided by ICICI Bank)', secretKey: 'Encryption Key (Provided by ICICI Bank)' }
                };
            case 'SBI_COLLECT':
                return {
                    merchantId: true, secretKey: true, accessCode: false, workingKey: false,
                    labels: { merchantId: 'Merchant Code (Provided by SBI)', secretKey: 'Checksum Key (Provided by SBI)' }
                };
            case 'HDFC_SMARTHUB':
                return {
                    merchantId: true, secretKey: false, accessCode: false, workingKey: true,
                    labels: { merchantId: 'Merchant ID (Provided by HDFC)', workingKey: 'Working Key (Provided by HDFC)' }
                };
            case 'AXIS_EASYPAY':
                return {
                    merchantId: true, secretKey: true, accessCode: false, workingKey: false,
                    labels: { merchantId: 'Merchant ID (Provided by Axis Bank)', secretKey: 'Secret Key (Provided by Axis Bank)' }
                };
            default:
                return {
                    merchantId: true, secretKey: true, accessCode: true, workingKey: true,
                    labels: { merchantId: 'Merchant ID', secretKey: 'Secret Key' }
                };
        }
    };

    const activeFields = getGatewayFields(paymentGateway);

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
                earlyPaymentDaysMonthly: parseInt(earlyPaymentDaysMonthly),
                earlyPaymentDaysQuarterly: parseInt(earlyPaymentDaysQuarterly),
                earlyPaymentDaysHalfYearly: parseInt(earlyPaymentDaysHalfYearly),
                earlyPaymentDaysYearly: parseInt(earlyPaymentDaysYearly),
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

            {/* How to Get ICICI Credentials Guide - Top Level */}
            {onlinePaymentEnabled && paymentGateway === 'ICICI_EAZYPAY' && (
                <details className="group border rounded-lg overflow-hidden">
                    <summary className="flex items-center justify-between p-4 cursor-pointer bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors">
                        <div className="flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-blue-900 dark:text-blue-100">How to Get ICICI Eazypay Credentials?</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-blue-600 transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="p-6 bg-white dark:bg-slate-900 space-y-4">
                        <div className="space-y-3">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs">1</span>
                                Contact ICICI Bank
                            </h4>
                            <p className="text-sm text-muted-foreground pl-8">
                                Reach out to your ICICI Bank relationship manager or visit the nearest ICICI Bank branch.
                                Request to enroll for <strong>"ICICI Eazypay Payment Gateway"</strong> service.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs">2</span>
                                Submit Required Documents
                            </h4>
                            <ul className="text-sm text-muted-foreground pl-8 space-y-1 list-disc">
                                <li>School registration certificate</li>
                                <li>PAN card of the institution</li>
                                <li>Current bank account details with ICICI</li>
                                <li>Website/portal URL (if available)</li>
                                <li>Authorized signatory documents</li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs">3</span>
                                Complete Registration Form
                            </h4>
                            <p className="text-sm text-muted-foreground pl-8">
                                ICICI will provide a merchant registration form. Fill it with school details, expected transaction volume,
                                and settlement preferences.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs">4</span>
                                Receive Credentials
                            </h4>
                            <p className="text-sm text-muted-foreground pl-8">
                                After approval (usually 3-5 business days), ICICI will provide:
                            </p>
                            <ul className="text-sm text-muted-foreground pl-8 space-y-1 list-disc">
                                <li><strong>Merchant ID:</strong> Your unique merchant identification number</li>
                                <li><strong>Encryption Key:</strong> Secret key for secure payment encryption (16-character key)</li>
                                <li>Access to merchant portal for transaction monitoring</li>
                            </ul>
                        </div>

                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>
                                    <strong>Important:</strong> Until you receive live credentials, keep <strong>Test Mode enabled</strong> to simulate payments
                                    safely during development.
                                </span>
                            </p>
                        </div>

                        <div className="pt-3 border-t">
                            <p className="text-xs text-muted-foreground">
                                <strong>Need help?</strong> Contact ICICI API Banking Support:
                                <a href="mailto:apibankingsupport@icicibank.com" className="text-blue-600 hover:underline ml-1">
                                    apibankingsupport@icicibank.com
                                </a>
                            </p>
                        </div>
                    </div>
                </details>
            )}


            <Tabs defaultValue="general" className="space-y-4">
                <TabsList className="grid bg-[#eef1f3] dark:bg-muted border grid-cols-2 lg:grid-cols-5 gap-1">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="receipts">Receipts</TabsTrigger>
                    <TabsTrigger value="discounts">Discounts</TabsTrigger>
                </TabsList>

                {/* ====== GENERAL SETTINGS ====== */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader className={'border-b'}>
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
                        <CardHeader className={'border-b'}>
                            <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" /> Online Payment Gateway</CardTitle>
                            <CardDescription>Configure the bank gateway for direct school settlements.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex justify-between items-center p- bg-muted/30 rounded-lg">
                                <div>
                                    <Label className="font-medium">Enable Online Payments</Label>
                                    <p className="text-xs text-muted-foreground">Allows parents to pay via the configured bank gateway</p>
                                </div>
                                <Switch
                                    checked={onlinePaymentEnabled}
                                    disabled={saveSettingsMutation.isPending}
                                    onCheckedChange={(checked) => {
                                        setOnlinePaymentEnabled(checked);
                                        // Auto-save immediately
                                        saveSettingsMutation.mutate({
                                            type: 'payment_gateway',
                                            settings: {
                                                onlinePaymentEnabled: checked,
                                                testMode,
                                                paymentGateway,
                                                merchantId,
                                                accessCode,
                                                secretKey,
                                                workingKey,
                                                successUrl,
                                                failureUrl,
                                            },
                                        });
                                    }}
                                    className={saveSettingsMutation.isPending ? 'opacity-50 cursor-wait' : ''}
                                />
                            </div>


                            {onlinePaymentEnabled && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                    {/* Test Mode Toggle */}
                                    <div className={`flex justify-between items-center p-4 rounded-lg border-2 ${testMode
                                        ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-700'
                                        : 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700'
                                        }`}>
                                        <div>
                                            <Label className="font-medium flex items-center gap-2">
                                                {testMode ? (
                                                    <>
                                                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                                                        Test Mode (Simulation)
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                        Live Mode (Real Bank)
                                                    </>
                                                )}
                                            </Label>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {testMode
                                                    ? 'Payments are simulated using the mock bank page. No real money is transferred.'
                                                    : 'Payments are processed through the real bank gateway. Ensure credentials are correct.'}
                                            </p>
                                        </div>
                                        <Switch
                                            checked={!testMode}
                                            disabled={saveSettingsMutation.isPending}
                                            onCheckedChange={(checked) => {
                                                const newTestMode = !checked;
                                                setTestMode(newTestMode);
                                                // Auto-save immediately
                                                saveSettingsMutation.mutate({
                                                    type: 'payment_gateway',
                                                    settings: {
                                                        onlinePaymentEnabled,
                                                        testMode: newTestMode,
                                                        paymentGateway,
                                                        merchantId,
                                                        accessCode,
                                                        secretKey,
                                                        workingKey,
                                                        successUrl,
                                                        failureUrl,
                                                    },
                                                });
                                            }}
                                            className={saveSettingsMutation.isPending ? 'opacity-50 cursor-wait' : ''}
                                        />
                                    </div>

                                    {!testMode && (
                                        <Alert variant="destructive" className="bg-red-50 dark:bg-red-950/30 border-red-300">
                                            <AlertCircle className="w-4 h-4" />
                                            <AlertDescription>
                                                <strong>Warning:</strong> Live mode is enabled. Real payments will be processed through the bank.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-base">School&apos;s Payment Gateway</Label>
                                        <Select value={paymentGateway} onValueChange={(v) => {
                                            setPaymentGateway(v);
                                            setVerificationStatus(null);

                                            // Check if we are switching back to the saved provider to restore values
                                            // Otherwise clear fields to avoid confusion (as keys are unique per bank)
                                            const savedSettings = settingsData?.settings;
                                            if (savedSettings && savedSettings.provider === v) {
                                                setMerchantId(savedSettings.merchantId || '');
                                                setSecretKey(savedSettings.secretKey || '');
                                                setAccessCode(savedSettings.accessCode || '');
                                                setWorkingKey(savedSettings.workingKey || '');
                                            } else {
                                                // New provider selected -> Clear fields
                                                setMerchantId('');
                                                setSecretKey('');
                                                setAccessCode('');
                                                setWorkingKey('');
                                            }
                                        }}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ICICI_EAZYPAY">ICICI Eazypay</SelectItem>
                                                {/* Other banks - Coming soon */}
                                                {/* <SelectItem value="SBI_COLLECT">SBI Collect</SelectItem> */}
                                                {/* <SelectItem value="HDFC_SMARTHUB">HDFC SmartHub</SelectItem> */}
                                                {/* <SelectItem value="AXIS_EASYPAY">Axis EasyPay</SelectItem> */}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground mt-1 text-blue-600 flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3" />
                                            This gateway is provided by your bank and settles payments directly into the school’s account.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                        {activeFields.merchantId && (
                                            <div className="space-y-2">
                                                <Label>{activeFields.labels.merchantId || 'Merchant ID'}</Label>
                                                <Input
                                                    value={merchantId}
                                                    onChange={e => { setMerchantId(e.target.value); setVerificationStatus(null); }}
                                                    placeholder="Enter ID provided by bank"
                                                />
                                            </div>
                                        )}

                                        {activeFields.secretKey && (
                                            <div className="space-y-2">
                                                <Label>{activeFields.labels.secretKey || 'Secret Key'}</Label>
                                                <div className="relative">
                                                    <Input
                                                        value={secretKey}
                                                        onChange={e => { setSecretKey(e.target.value); setVerificationStatus(null); }}
                                                        type={showSecrets ? "text" : "password"}
                                                        placeholder="••••••••••••••••"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400"
                                                        onClick={() => setShowSecrets(!showSecrets)}
                                                    >
                                                        {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {activeFields.workingKey && (
                                            <div className="space-y-2">
                                                <Label>{activeFields.labels.workingKey || 'Working Key'}</Label>
                                                <div className="relative">
                                                    <Input
                                                        value={workingKey}
                                                        onChange={e => { setWorkingKey(e.target.value); setVerificationStatus(null); }}
                                                        type={showSecrets ? "text" : "password"}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400"
                                                        onClick={() => setShowSecrets(!showSecrets)}
                                                    >
                                                        {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {activeFields.accessCode && (
                                            <div className="space-y-2">
                                                <Label>Access Code</Label>
                                                <Input value={accessCode} onChange={e => setAccessCode(e.target.value)} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => verifyGatewayMutation.mutate()}
                                            disabled={isVerifying}
                                            className={`${verificationStatus === 'success' ? 'border-green-500 text-green-600 bg-green-50' : ''}`}
                                        >
                                            {isVerifying ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : verificationStatus === 'success' ? (
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                            ) : verificationStatus === 'error' ? (
                                                <XCircle className="w-4 h-4 mr-2" />
                                            ) : (
                                                <ShieldCheck className="w-4 h-4 mr-2" />
                                            )}
                                            {isVerifying ? 'Verifying...' : verificationStatus === 'success' ? 'Verified' : 'Verify Configuration'}
                                        </Button>

                                        <Button onClick={handleSavePaymentGateway} disabled={saveSettingsMutation.isPending}>
                                            {saveSettingsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Save Gateway Settings
                                        </Button>
                                    </div>

                                    {/* Developer Tool Link (Only in Development) */}
                                    {process.env.NODE_ENV === 'development' && (
                                        <div className="mt-6 p-4 border border-dashed border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg flex items-start gap-3">
                                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-md text-yellow-600">
                                                {/* Requires importing Zap if not already available, checking imports separately or assuming it's okay since used in other components */}
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Developer Testing Mode</h4>
                                                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 mb-2">
                                                    Since you are running in functionality development mode, you can verify the entire payment flow (callback handling) using the simulator.
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-yellow-200 hover:bg-yellow-100 text-yellow-700"
                                                    onClick={() => window.open('/dashboard/fees/dev-tools', '_blank')}
                                                >
                                                    Open Callback Simulator
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {verificationStatus === 'success' && (
                                        <div className="text-sm text-green-600 flex items-center gap-2 bg-green-50 p-3 rounded-lg border border-green-100">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Configuration looks good! Checksum generation validated.
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>


                {/* ====== NOTIFICATIONS ====== */}
                <TabsContent value="notifications">
                    <Card>
                        <CardHeader className={'border-b'}>
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
                        <CardHeader className={'border-b'}>
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

                            {/* Custom Logo Upload - Only shown when logo is enabled */}
                            {showSchoolLogo && (
                                <div className="space-y-2 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                                    <Label>Custom Receipt Logo (Optional)</Label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Upload a custom logo for receipts, or leave empty to use school logo
                                    </p>
                                    <FileUploadButton
                                        field="Receipt Logo"
                                        onChange={setCustomReceiptLogo}
                                        saveToLibrary={false}
                                    />
                                    {customReceiptLogo && (
                                        <div className="mt-2">
                                            <p className="text-xs text-green-600">✓ Custom logo uploaded</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Custom Email */}
                            <div className="space-y-2">
                                <Label>Receipt Email (Optional)</Label>
                                <Input
                                    type="email"
                                    value={customReceiptEmail}
                                    onChange={(e) => setCustomReceiptEmail(e.target.value)}
                                    placeholder={settingsData?.school?.email || "e.g., fees@yourschool.com"}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Leave empty to use school email{settingsData?.school?.email ? `: ${settingsData.school.email}` : ''}. This will be displayed on receipts.
                                </p>
                            </div>

                            {/* Custom Phone */}
                            <div className="space-y-2">
                                <Label>Receipt Phone Number (Optional)</Label>
                                <Input
                                    type="tel"
                                    value={customReceiptPhone}
                                    onChange={(e) => setCustomReceiptPhone(e.target.value)}
                                    placeholder={settingsData?.school?.contactNumber || "e.g., +91 9876543210"}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Leave empty to use school contact number{settingsData?.school?.contactNumber ? `: ${settingsData.school.contactNumber}` : ''}. This will be displayed on receipts.
                                </p>
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

                            {/* Receipt Preview */}
                            {/* Document Preview */}
                            <div className="border-t pt-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-medium">Document Preview</h3>
                                    <div className="flex gap-2">
                                        <Button
                                            variant={previewType === 'receipt' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setPreviewType('receipt')}
                                        >
                                            Receipt
                                        </Button>
                                        <Button
                                            variant={previewType === 'statement' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setPreviewType('statement')}
                                        >
                                            Fee Statement
                                        </Button>
                                    </div>
                                </div>

                                {previewType === 'receipt' ? (
                                    <ReceiptPreview
                                        schoolData={{
                                            ...(settingsData?.school || {}),
                                            // Override with custom values if provided
                                            profilePicture: customReceiptLogo || settingsData?.school?.profilePicture,
                                            email: customReceiptEmail || settingsData?.school?.email,
                                            contactNumber: customReceiptPhone || settingsData?.school?.contactNumber,
                                        }}
                                        settings={{
                                            showSchoolLogo,
                                            receiptFooterText,
                                            receiptPrefix,
                                        }}
                                    />
                                ) : (
                                    <div className="w-full overflow-x-auto bg-gray-50 p-4 border rounded-lg flex justify-center">
                                        <div className="transform scale-[0.65] origin-top h-[950px] w-[8.5in] min-w-[8.5in] border shadow-lg bg-white mx-auto">
                                            <FeeStatementTemplate
                                                schoolData={{
                                                    ...(settingsData?.school || {}),
                                                    profilePicture: customReceiptLogo || settingsData?.school?.profilePicture,
                                                    name: settingsData?.school?.name || 'School Name',
                                                    location: settingsData?.school?.location || 'School Address',
                                                    contactNumber: customReceiptPhone || settingsData?.school?.contactNumber,
                                                    email: customReceiptEmail || settingsData?.school?.email,
                                                }}
                                                studentData={{
                                                    studentName: 'John Doe',
                                                    admissionNo: 'AD001',
                                                    className: '10th',
                                                    sectionName: 'A',
                                                    rollNo: '12',
                                                    feeStructureName: 'Class 10 Fee Structure',
                                                    academicYear: '2025-26',
                                                }}
                                                feeSummary={{
                                                    totalFee: 24000,
                                                    totalPaid: 6000,
                                                    totalDiscount: 3600,
                                                    balanceDue: 14400,
                                                }}
                                                ledgerData={[
                                                    { descriptor: 'Q1 (Apr-Jun)', subDescriptor: '2025', dueDate: '15 Jan 2026', amount: 6000, paidDate: '02 Jan 2026', receiptNo: 'R-221', discount: 0, status: 'Paid' },
                                                    { descriptor: 'Q2 (Jul-Sep)', subDescriptor: '2025', dueDate: '15 May 2026', amount: 6000, paidDate: null, receiptNo: '—', discount: 1200, status: 'Pending' },
                                                    { descriptor: 'Q3 (Oct-Dec)', subDescriptor: '2025', dueDate: '15 Jul 2026', amount: 6000, paidDate: null, receiptNo: '—', discount: 1200, status: 'Pending' },
                                                    { descriptor: 'Q4 (Jan-Mar)', subDescriptor: '2026', dueDate: '15 Oct 2026', amount: 6000, paidDate: null, receiptNo: '—', discount: 1200, status: 'Pending' },
                                                ]}
                                                receiptsList={[
                                                    { number: 'R-221', date: '02 Jan 2026', amount: 6000, mode: 'Net Banking' }
                                                ]}
                                            />
                                        </div>
                                    </div>
                                )}
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
                        <CardHeader className={'border-b'}>
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
                                    <div className="space-y-4 w-full">
                                        <div className="flex items-center gap-4 flex-wrap pb-2 border-b">
                                            <Input
                                                type="number"
                                                value={earlyPaymentDiscountPercentage}
                                                onChange={(e) => setEarlyPaymentDiscountPercentage(e.target.value)}
                                                className="max-w-[100px]"
                                            />
                                            <span className="text-sm font-medium">% discount if paid using below rules:</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                            {/* Monthly */}
                                            <div className="flex flex-col gap-1">
                                                <Label className="text-xs text-muted-foreground">Monthly Installments</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        value={earlyPaymentDaysMonthly}
                                                        onChange={(e) => setEarlyPaymentDaysMonthly(e.target.value)}
                                                        className="max-w-[80px]"
                                                    />
                                                    <span className="text-sm">days before</span>
                                                </div>
                                            </div>

                                            {/* Quarterly */}
                                            <div className="flex flex-col gap-1">
                                                <Label className="text-xs text-muted-foreground">Quarterly Installments</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        value={earlyPaymentDaysQuarterly}
                                                        onChange={(e) => setEarlyPaymentDaysQuarterly(e.target.value)}
                                                        className="max-w-[80px]"
                                                    />
                                                    <span className="text-sm">days before</span>
                                                </div>
                                            </div>

                                            {/* Half-Yearly */}
                                            <div className="flex flex-col gap-1">
                                                <Label className="text-xs text-muted-foreground">Half-Yearly Installments</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        value={earlyPaymentDaysHalfYearly}
                                                        onChange={(e) => setEarlyPaymentDaysHalfYearly(e.target.value)}
                                                        className="max-w-[80px]"
                                                    />
                                                    <span className="text-sm">days before</span>
                                                </div>
                                            </div>

                                            {/* Yearly */}
                                            <div className="flex flex-col gap-1">
                                                <Label className="text-xs text-muted-foreground">Yearly Installments</Label>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        value={earlyPaymentDaysYearly}
                                                        onChange={(e) => setEarlyPaymentDaysYearly(e.target.value)}
                                                        className="max-w-[80px]"
                                                    />
                                                    <span className="text-sm">days before</span>
                                                </div>
                                            </div>
                                        </div>
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
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                    <strong>Important:</strong>
                    <p className="text-sm mt-1">
                        Online payments are processed directly by the school’s bank through the selected payment gateway.
                        EduBreezy does not collect, hold, or process funds. All payments are settled directly into the school’s bank account.
                    </p>
                </AlertDescription>
            </Alert>
        </div >
    );
}
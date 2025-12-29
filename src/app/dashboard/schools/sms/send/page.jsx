'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
    Loader2,
    Send,
    AlertCircle,
    CheckCircle,
    CreditCard,
    TestTube,
    Lock,
    Info,
    Users,
    User,
    GraduationCap,
    Briefcase,
    UserCog,
    Edit3,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import smsService from '@/lib/fast2sms';

const MAX_MESSAGE_LENGTH = 100;
const MAX_SMS_LENGTH = 160;

const RECIPIENT_TYPES = [
    { value: 'parents', label: 'All Parents', icon: Users, description: 'All parent contacts' },
    { value: 'parent_class', label: 'Parents by Class', icon: GraduationCap, description: 'Filter by class/section' },
    { value: 'teachers', label: 'All Teachers', icon: User, description: 'Teaching staff' },
    { value: 'non_teaching', label: 'Non-Teaching Staff', icon: Briefcase, description: 'Support staff' },
    { value: 'all_staff', label: 'All Staff', icon: UserCog, description: 'Teachers + Non-Teaching' },
    { value: 'manual', label: 'Manual Numbers', icon: Edit3, description: 'Enter manually' },
];

export default function SendSmsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [recipientType, setRecipientType] = useState('parents');
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedSection, setSelectedSection] = useState('all');
    const [manualNumbers, setManualNumbers] = useState('');
    const [form, setForm] = useState({ templateId: '', variables: {} });
    const [previewData, setPreviewData] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [fetchedRecipients, setFetchedRecipients] = useState([]);
    const [isFetchingRecipients, setIsFetchingRecipients] = useState(false);

    const { data: school } = useQuery({
        queryKey: ['school', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId,
    });

    const { data: templates } = useQuery({
        queryKey: ['sms-templates'],
        queryFn: async () => {
            const res = await fetch('/api/sms/templates');
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
    });

    const { data: wallet } = useQuery({
        queryKey: ['sms-wallet', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/sms/wallet`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId,
    });

    const { data: classes } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId,
    });

    const { data: sections } = useQuery({
        queryKey: ['sections', schoolId, selectedClass],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes/${selectedClass}/sections`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId && selectedClass !== 'all',
    });

    const selectedTemplate = templates?.find((t) => t.id === form.templateId);

    useEffect(() => {
        if (selectedTemplate?.variables?.includes('SCHOOL_NAME') && school?.name) {
            setForm(prev => ({ ...prev, variables: { ...prev.variables, SCHOOL_NAME: school.name } }));
        }
    }, [selectedTemplate, school?.name]);

    useEffect(() => {
        if (recipientType === 'manual') { setFetchedRecipients([]); return; }

        const fetchRecipients = async () => {
            setIsFetchingRecipients(true);
            try {
                const params = new URLSearchParams({
                    type: recipientType,
                    ...(selectedClass !== 'all' && { classId: selectedClass }),
                    ...(selectedSection !== 'all' && { sectionId: selectedSection }),
                });
                const res = await fetch(`/api/schools/${schoolId}/sms/recipients?${params}`);
                if (!res.ok) throw new Error('Failed');
                const data = await res.json();
                setFetchedRecipients(data.recipients || []);
            } catch { setFetchedRecipients([]); }
            finally { setIsFetchingRecipients(false); }
        };
        if (schoolId) fetchRecipients();
    }, [recipientType, selectedClass, selectedSection, schoolId]);

    const recipients = useMemo(() => {
        if (recipientType === 'manual') {
            return manualNumbers.split(/[,\n]/).map(s => s.trim()).filter(s => s && /^\d{10}$/.test(s));
        }
        return fetchedRecipients;
    }, [recipientType, manualNumbers, fetchedRecipients]);

    const validateVariable = (varName, value) => {
        if (['MESSAGE', 'NOTICE_TEXT', 'REASON'].includes(varName)) return smsService.validateMessageContent(value, varName);
        if (['LINK', 'URL'].includes(varName)) return { ...smsService.validateLink(value), charCount: value?.length || 0 };
        return { valid: true, errors: [], charCount: value?.length || 0 };
    };

    const renderedMessage = useMemo(() => {
        if (!selectedTemplate) return '';
        return smsService.renderTemplate(selectedTemplate.content, form.variables);
    }, [selectedTemplate, form.variables]);

    const smsLengthValidation = useMemo(() => smsService.validateSmsLength(renderedMessage), [renderedMessage]);
    const hasValidationErrors = useMemo(() => Object.values(validationErrors).some(v => v?.errors?.length > 0), [validationErrors]);

    const handleVariableChange = (varName, value) => {
        setForm(prev => ({ ...prev, variables: { ...prev.variables, [varName]: value } }));
        setValidationErrors(prev => ({ ...prev, [varName]: validateVariable(varName, value) }));
    };

    const previewMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/sms/send`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, preview: true }),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
            return res.json();
        },
        onSuccess: (data) => setPreviewData(data),
        onError: (error) => toast.error(error.message),
    });

    const sendMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/sms/send`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(`SMS sent to ${data.recipientCount} recipients!`);
            queryClient.invalidateQueries(['sms-wallet', schoolId]);
            setForm({ templateId: '', variables: {} });
            setPreviewData(null);
            setManualNumbers('');
        },
        onError: (error) => toast.error(error.message),
    });

    const testMutation = useMutation({
        mutationFn: async () => {
            const adminPhone = fullUser?.Admin?.phone || fullUser?.phone;
            if (!adminPhone) throw new Error('No phone in profile');
            const res = await fetch(`/api/schools/${schoolId}/sms/send`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId: form.templateId, variables: form.variables, recipients: [adminPhone] }),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
            return res.json();
        },
        onSuccess: () => { toast.success('Test SMS sent!'); queryClient.invalidateQueries(['sms-wallet', schoolId]); },
        onError: (error) => toast.error(error.message),
    });

    const handlePreview = () => {
        if (!form.templateId) return toast.error('Select a template');
        if (recipients.length === 0) return toast.error('No recipients');
        if (hasValidationErrors) return toast.error('Fix errors first');
        if (!smsLengthValidation.valid) return toast.error(smsLengthValidation.error);
        previewMutation.mutate({ templateId: form.templateId, variables: form.variables, recipients });
    };

    const handleSend = () => {
        sendMutation.mutate({ templateId: form.templateId, variables: form.variables, recipients });
    };

    const isAutoFilled = (varName) => varName === 'SCHOOL_NAME';
    const isMessageField = (varName) => ['MESSAGE', 'NOTICE_TEXT', 'REASON'].includes(varName);

    if (!schoolId) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Send SMS</h1>
                <p className="text-muted-foreground text-sm">Send bulk SMS using DLT-compliant templates</p>
            </div>

            <Separator />

            {/* Big Status Section */}
            <Card className="bg-[#0168fb] text-white border-none shadow-lg">
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <CreditCard className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-medium text-blue-100">Available Balance</h2>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-bold text-white mt-1">{wallet?.balance?.toFixed(0) || '0'}</p>
                                <span className="text-blue-100">Credits</span>
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        size="lg"
                        className="bg-white text-blue-600 hover:bg-blue-50 border-0"
                        onClick={() => window.location.href = '/dashboard/schools/sms/wallet'}
                    >
                        Recharge Wallet
                    </Button>
                </CardContent>
            </Card>

            <Separator />

            {/* 2 Column Layout */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Column 1: Recipients */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Recipients
                        </CardTitle>
                        <CardDescription className="text-xs">Select who will receive the SMS</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <RadioGroup value={recipientType} onValueChange={(v) => { setRecipientType(v); setPreviewData(null); }} className="space-y-1">
                            {RECIPIENT_TYPES.map((type) => {
                                const Icon = type.icon;
                                const isSelected = recipientType === type.value;
                                return (
                                    <label key={type.value} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                                        <RadioGroupItem value={type.value} className="sr-only" />
                                        <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm">{type.label}</p>
                                            <p className="text-xs text-muted-foreground truncate">{type.description}</p>
                                        </div>
                                        {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                                    </label>
                                );
                            })}
                        </RadioGroup>

                        {recipientType === 'parent_class' && (
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                                <div>
                                    <Label className="text-xs">Class</Label>
                                    <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSection('all'); }}>
                                        <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Classes</SelectItem>
                                            {classes?.map((cls) => <SelectItem key={cls.id} value={cls.id.toString()}>{cls.className}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedClass !== 'all' && sections?.length > 0 && (
                                    <div>
                                        <Label className="text-xs">Section</Label>
                                        <Select value={selectedSection} onValueChange={setSelectedSection}>
                                            <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                {sections.map((sec) => <SelectItem key={sec.id} value={sec.id.toString()}>{sec.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}

                        {recipientType === 'manual' && (
                            <div className="pt-2 border-t">
                                <Label className="text-xs">Phone Numbers (10 digits each)</Label>
                                <textarea value={manualNumbers} onChange={(e) => setManualNumbers(e.target.value)}
                                    className="w-full min-h-[100px] px-3 py-2 mt-1 border rounded-md bg-background text-sm font-mono"
                                    placeholder="9876543210&#10;9876543211" />
                            </div>
                        )}

                        <div className={`p-3 rounded-lg flex items-center gap-3 ${recipients.length > 0 ? 'bg-green-500/10 text-green-600' : 'bg-muted'}`}>
                            {isFetchingRecipients ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                            <span className="font-semibold">{isFetchingRecipients ? '...' : recipients.length} recipients</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Column 2: Message */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            Message
                        </CardTitle>
                        <CardDescription className="text-xs">Select template and fill details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <Label className="text-xs">Template *</Label>
                            <Select value={form.templateId} onValueChange={(v) => { setForm({ ...form, templateId: v, variables: {} }); setPreviewData(null); setValidationErrors({}); }}>
                                <SelectTrigger className="h-10 mt-1"><SelectValue placeholder="Choose a template..." /></SelectTrigger>
                                <SelectContent>
                                    {templates?.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            <span className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                                                {t.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedTemplate?.variables?.map((varName) => {
                            const validation = validationErrors[varName];
                            const charCount = form.variables[varName]?.length || 0;
                            const hasError = validation?.errors?.length > 0;

                            return (
                                <div key={varName}>
                                    <div className="flex items-center justify-between mb-1">
                                        <Label className="text-xs flex items-center gap-1">
                                            {varName.replace(/_/g, ' ')}
                                            {isAutoFilled(varName) && <Lock className="h-3 w-3 text-muted-foreground" />}
                                        </Label>
                                        {isMessageField(varName) && (
                                            <span className={`text-xs ${charCount > MAX_MESSAGE_LENGTH ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                {charCount}/{MAX_MESSAGE_LENGTH}
                                            </span>
                                        )}
                                    </div>
                                    {isMessageField(varName) ? (
                                        <textarea value={form.variables[varName] || ''} onChange={(e) => handleVariableChange(varName, e.target.value)}
                                            className={`w-full min-h-[70px] px-3 py-2 border rounded-md bg-background text-sm ${hasError ? 'border-red-500' : ''}`}
                                            placeholder={`Enter ${varName.toLowerCase()}`} />
                                    ) : (
                                        <Input value={form.variables[varName] || ''} onChange={(e) => handleVariableChange(varName, e.target.value)}
                                            disabled={isAutoFilled(varName)} className={`h-9 ${hasError ? 'border-red-500' : ''}`}
                                            placeholder={isAutoFilled(varName) ? 'Auto-filled' : `Enter ${varName.toLowerCase()}`} />
                                    )}
                                    {hasError && <p className="text-xs text-red-500 mt-1">{validation.errors[0]}</p>}
                                </div>
                            );
                        })}

                        {selectedTemplate && (
                            <div className={`p-2 rounded-md flex items-center justify-between text-sm ${!smsLengthValidation.valid ? 'bg-red-500/10 text-red-500' : 'bg-muted'}`}>
                                <span>Message Length</span>
                                <span className="font-mono">{smsLengthValidation.length}/{MAX_SMS_LENGTH}</span>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => testMutation.mutate()} disabled={!form.templateId || testMutation.isPending} className="flex-1">
                                {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><TestTube className="h-4 w-4 mr-1" />Test</>}
                            </Button>
                            <Button onClick={handlePreview} disabled={previewMutation.isPending || !form.templateId || recipients.length === 0} className="flex-1">
                                {previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Preview'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom: Preview & Send */}
            {previewData && (
                <Card>
                    <CardContent className="p-6">
                        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6">
                            {/* Phone Mockup with SMS */}
                            <div className="flex justify-center">
                                <div className="w-[300px] bg-gray-900 rounded-[2.5rem] p-2 relative">
                                    {/* Phone notch */}
                                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />
                                    {/* Phone screen */}
                                    <div className="bg-white dark:bg-gray-800 rounded-[2rem] overflow-hidden">
                                        {/* Header */}
                                        <div className="px-4 py-3 pt-10 border-b border-gray-200 dark:border-gray-700">
                                            <p className="text-base font-semibold text-gray-900 dark:text-white text-center">Messages</p>
                                        </div>
                                        {/* Message area */}
                                        <div className="p-4 min-h-[380px] flex flex-col justify-end bg-gray-50 dark:bg-gray-900">
                                            {/* SMS Bubble */}
                                            <div className="max-w-[85%] ml-auto">
                                                <div className="bg-[#007AFF] text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-sm leading-relaxed">
                                                    {previewData.message}
                                                </div>
                                                <p className="text-[10px] text-gray-400 text-right mt-1">Delivered</p>
                                            </div>
                                        </div>
                                        {/* Bottom input bar */}
                                        <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2.5 flex items-center gap-2 border-t border-gray-200 dark:border-gray-700">
                                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-500 text-sm">+</div>
                                            <div className="flex-1 bg-white dark:bg-gray-700 rounded-full px-4 py-2 text-sm text-gray-400 border border-gray-200 dark:border-gray-600">iMessage</div>
                                            <div className="w-8 h-8 rounded-full bg-[#007AFF] flex items-center justify-center text-white text-sm">↑</div>
                                        </div>
                                        {/* Home indicator */}
                                        <div className="py-2 flex justify-center bg-white dark:bg-gray-800">
                                            <div className="w-28 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Separator */}
                            <div className="hidden md:flex items-center justify-center">
                                <div className="w-px h-full bg-border" />
                            </div>

                            {/* Stats and Send */}
                            <div className="flex flex-col justify-center space-y-5">
                                <h3 className="text-xl font-semibold">Ready to Send</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 border rounded-lg text-center">
                                        <p className="text-5xl font-bold text-primary">{previewData.recipientCount}</p>
                                        <p className="text-sm text-muted-foreground mt-2">Recipients</p>
                                    </div>
                                    <div className="p-5 border rounded-lg text-center">
                                        <p className="text-5xl font-bold text-green-600">{previewData.cost}</p>
                                        <p className="text-sm text-muted-foreground mt-2">Credits</p>
                                    </div>
                                </div>

                                <div className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Available Balance</span>
                                        <span className="font-semibold">{wallet?.balance || 0} credits</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mt-2">
                                        <span className="text-muted-foreground">After Sending</span>
                                        <span className={`font-semibold ${(wallet?.balance || 0) - previewData.cost < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            {(wallet?.balance || 0) - previewData.cost} credits
                                        </span>
                                    </div>
                                </div>

                                {wallet?.balance < previewData.cost && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Insufficient credits! You have {wallet?.balance} but need {previewData.cost}.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Button
                                    onClick={handleSend}
                                    size="lg"
                                    className="w-full h-14 text-base"
                                    disabled={sendMutation.isPending || wallet?.balance < previewData.cost}
                                >
                                    {sendMutation.isPending ? (
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    ) : (
                                        <Send className="h-5 w-5 mr-2" />
                                    )}
                                    Send to {previewData.recipientCount} Recipients
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Guidelines */}
            <Alert variant="default" className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                    <strong>Guidelines:</strong> Max 100 chars for message fields, no links/phone numbers. SCHOOL_NAME is auto-filled.
                </AlertDescription>
            </Alert>
        </div>
    );
}

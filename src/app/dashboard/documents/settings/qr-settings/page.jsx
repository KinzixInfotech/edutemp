// app/documents/[schoolId]/qr-settings/page.jsx
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Loader2, Save, Eye, QrCode } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/context/AuthContext';
import LoaderPage from '@/components/loader-page';

const formSchema = z.object({
    enabledForCertificates: z.boolean(),
    enabledForIdCards: z.boolean(),
    enabledForAdmitCards: z.boolean(),
    encodeStudentId: z.boolean(),
    encodeCertificateId: z.boolean(),
    encodeIssueDate: z.boolean(),
    encodeSchoolId: z.boolean(),
    encodeVerificationUrl: z.boolean(),
    qrPlacementX: z.number().min(0).max(600),
    qrPlacementY: z.number().min(0).max(842),
    qrSize: z.number().min(50).max(200),
    qrColor: z.string(),
    qrBackground: z.string(),
    errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']),
    logoOverlayUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    verificationBaseUrl: z.string().url(),
    portalTitle: z.string(),
    portalLogoUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    portalPrimaryColor: z.string(),
    useHashEncryption: z.boolean(),
    hashAlgorithm: z.enum(['SHA256', 'SHA512']),
    qrValidityDays: z.union([z.number().int().min(1), z.null(), z.literal('')]).optional(),
});

export default function Page() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const userId = fullUser?.id;

    const queryClient = useQueryClient();
    const [qrPreview, setQrPreview] = useState('');
    const [sampleData, setSampleData] = useState({});

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        control,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            enabledForCertificates: true,
            enabledForIdCards: true,
            enabledForAdmitCards: false,
            encodeStudentId: true,
            encodeCertificateId: true,
            encodeIssueDate: true,
            encodeSchoolId: true,
            encodeVerificationUrl: true,
            qrPlacementX: 500,
            qrPlacementY: 720,
            qrSize: 120,
            qrColor: '#000000',
            qrBackground: '#FFFFFF',
            errorCorrectionLevel: 'M',
            verificationBaseUrl: 'https://your-school.com/verify',
            portalTitle: 'Verify Certificate',
            portalPrimaryColor: '#1e40af',
            useHashEncryption: true,
            hashAlgorithm: 'SHA256',
        },
    });

    const watched = watch();

    // FETCH SETTINGS
    const { data: settings, isLoading } = useQuery({
        queryKey: ['qr-settings', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/documents/${schoolId}/qr-settings`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // FETCH SAMPLE DATA
    const { data: sample } = useQuery({
        queryKey: ['sample-data', schoolId],
        queryFn: async () => {
            const [studentsRes, certsRes] = await Promise.all([
                fetch(`/api/students/${schoolId}?limit=1`),
                fetch(`/api/documents/${schoolId}/generated?limit=1`),
            ]);

            const [students, certs] = await Promise.all([
                studentsRes.ok ? studentsRes.json() : [],
                certsRes.ok ? certsRes.json() : [],
            ]);

            return {
                student: students[0] || null,
                certificate: certs[0] || null,
            };
        },
        enabled: !!schoolId,
    });

    // SAVE MUTATION
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/documents/${schoolId}/qr-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, userId }),
            });
            if (!res.ok) {
                const error = await res.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(error.error || 'Failed to save');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['qr-settings', schoolId] });
            toast.success('Settings saved!');
        },
        onError: (error) => {
            console.error('Save error:', error);
            toast.error(error.message || 'Save failed!');
        },
    });

    // SET FORM VALUES FROM API
    useEffect(() => {
        if (settings && settings.id) {
            Object.entries(settings).forEach(([key, value]) => {
                if (key in formSchema.shape) {
                    setValue(key, value);
                }
            });
        }
    }, [settings, setValue]);

    // SET SAMPLE DATA
    useEffect(() => {
        if (sample) setSampleData(sample);
    }, [sample]);

    // GENERATE QR PREVIEW
    const qrDependencies = [
        watched.encodeStudentId,
        watched.encodeCertificateId,
        watched.encodeIssueDate,
        watched.encodeSchoolId,
        watched.encodeVerificationUrl,
        watched.verificationBaseUrl,
        watched.qrSize,
        watched.qrColor,
        watched.qrBackground,
        watched.errorCorrectionLevel,
        JSON.stringify(sampleData),
        schoolId,
    ];

    useEffect(() => {
        const payload = {};

        if (watched.encodeStudentId && sampleData.student) {
            payload.studentId = sampleData.student.id;
        }
        if (watched.encodeCertificateId && sampleData.certificate) {
            payload.certificateId = sampleData.certificate.id;
            payload.certificateNumber = sampleData.certificate.certificateNumber;
        }
        if (watched.encodeIssueDate) {
            payload.issueDate = new Date().toISOString();
        }
        if (watched.encodeSchoolId) {
            payload.schoolId = schoolId;
        }
        if (watched.encodeVerificationUrl && watched.verificationBaseUrl) {
            const id = sampleData.certificate?.id || 'demo';
            payload.verificationUrl = `${watched.verificationBaseUrl}/${id}`;
        }

        if (Object.keys(payload).length === 0) {
            setQrPreview('');
            return;
        }

        const timeoutId = setTimeout(() => {
            QRCode.toDataURL(JSON.stringify(payload), {
                width: watched.qrSize,
                color: { dark: watched.qrColor, light: watched.qrBackground },
                errorCorrectionLevel: watched.errorCorrectionLevel,
                margin: 1,
            })
                .then(setQrPreview)
                .catch(() => setQrPreview(''));
        }, 300);

        return () => clearTimeout(timeoutId);
    }, qrDependencies);

    const onSubmit = (data) => {
        console.log('✅ Form submitted with data:', data);
        console.log('Form errors:', errors);
        saveMutation.mutate(data);
    };

    const onError = (errors) => {
        console.error('❌ Form validation errors:', errors);
        toast.error('Please fix form errors');
    };

    const handleSaveClick = async () => {
        console.log('🔵 Save button clicked!');
        console.log('Current form values:', watched);
        console.log('Current errors:', errors);

        // Manually trigger validation and submission
        await handleSubmit(onSubmit, onError)();
    };

    if (!schoolId || isLoading) return <div className="p-6"><LoaderPage /></div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <QrCode className="w-8 h-8" />
                        QR Settings
                    </h1>
                    <p className="text-muted-foreground">School: {schoolId}</p>
                </div>
                <Button onClick={handleSaveClick} disabled={saveMutation.isPending} type="button">
                    {saveMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Settings
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Tabs defaultValue="enablement" className="w-full">
                        <TabsList className="grid w-full grid-cols-6">
                            <TabsTrigger value="enablement">Enable</TabsTrigger>
                            <TabsTrigger value="encoding">Data</TabsTrigger>
                            <TabsTrigger value="placement">Placement</TabsTrigger>
                            <TabsTrigger value="design">Design</TabsTrigger>
                            <TabsTrigger value="portal">Portal</TabsTrigger>
                            <TabsTrigger value="security">Security</TabsTrigger>
                        </TabsList>

                        {/* ENABLEMENT */}
                        <TabsContent value="enablement" className="space-y-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Enable QR Codes</CardTitle>
                                    <CardDescription>Toggle per document type</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {[
                                        { id: 'enabledForCertificates', label: 'Certificates' },
                                        { id: 'enabledForIdCards', label: 'ID Cards' },
                                        { id: 'enabledForAdmitCards', label: 'Admit Cards' },
                                    ].map((item) => (
                                        <div key={item.id} className="flex items-center justify-between">
                                            <Label htmlFor={item.id}>{item.label}</Label>
                                            <Controller
                                                name={item.id}
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id={item.id}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* ENCODING */}
                        <TabsContent value="encoding" className="space-y-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>QR Data Encoding</CardTitle>
                                    <CardDescription>Select data to embed</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {[
                                        { id: 'encodeStudentId', label: 'Student ID' },
                                        { id: 'encodeCertificateId', label: 'Certificate Number' },
                                        { id: 'encodeIssueDate', label: 'Issue Date' },
                                        { id: 'encodeSchoolId', label: 'School ID' },
                                        { id: 'encodeVerificationUrl', label: 'Verification URL' },
                                    ].map((item) => (
                                        <div key={item.id} className="flex items-center justify-between">
                                            <Label htmlFor={item.id}>{item.label}</Label>
                                            <Controller
                                                name={item.id}
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id={item.id}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* PLACEMENT */}
                        <TabsContent value="placement" className="space-y-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>QR Placement</CardTitle>
                                    <CardDescription>Position on A4 (595×842 pts)</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className='flex flex-col gap-2.5'>
                                            <Label>X Position (pts)</Label>
                                            <Input type="number" {...register('qrPlacementX', { valueAsNumber: true })} />
                                        </div>
                                        <div className='flex flex-col gap-2.5'>

                                            <Label>Y Position (pts)</Label>
                                            <Input type="number" {...register('qrPlacementY', { valueAsNumber: true })} />
                                        </div>
                                    </div>
                                    <div className='flex flex-col gap-2.5'>

                                        <Label>Size (pts): {watched.qrSize}</Label>
                                        <Slider
                                            value={[watched.qrSize]}
                                            onValueChange={(v) => setValue('qrSize', v[0])}
                                            min={50}
                                            max={200}
                                            step={10}
                                            className="mt-2"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* DESIGN */}
                        <TabsContent value="design" className="space-y-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>QR Design</CardTitle>
                                    <CardDescription>Customize appearance</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className='flex flex-col gap-2.5'>

                                            <Label>Foreground</Label>
                                            <Input type="color" {...register('qrColor')} className="h-10" />
                                        </div>
                                        <div className='flex flex-col gap-2.5'>
                                            <Label>Background</Label>
                                            <Input type="color" {...register('qrBackground')} className="h-10" />
                                        </div>
                                    </div>
                                    <div className='flex flex-col gap-2.5'>

                                        <Label>Error Correction</Label>
                                        <Select value={watched.errorCorrectionLevel} onValueChange={(v) => setValue('errorCorrectionLevel', v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="L">Low</SelectItem>
                                                <SelectItem value="M">Medium</SelectItem>
                                                <SelectItem value="Q">Quartile</SelectItem>
                                                <SelectItem value="H">High</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className='flex flex-col gap-2.5'>

                                        <Label>Logo URL</Label>
                                        <Input {...register('logoOverlayUrl')} placeholder="https://..." />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* PORTAL */}
                        <TabsContent value="portal" className="space-y-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Verification Portal</CardTitle>
                                    <CardDescription>Branding</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className='flex flex-col gap-2.5'>

                                        <Label>Base URL</Label>
                                        <Input {...register('verificationBaseUrl')} placeholder="https://yourschool.com/verify" />
                                        {errors.verificationBaseUrl && <p className="text-red-500 text-xs mt-1">Invalid URL</p>}
                                    </div>
                                    <div className='flex flex-col gap-2.5'>

                                        <Label>Title</Label>
                                        <Input {...register('portalTitle')} />
                                    </div>
                                    <div className='flex flex-col gap-2.5'>

                                        <Label>Logo URL</Label>
                                        <Input {...register('portalLogoUrl')} placeholder="https://..." />
                                        {errors.portalLogoUrl && <p className="text-red-500 text-xs mt-1">Invalid URL</p>}
                                    </div>
                                    <div className='flex flex-col gap-2.5'>

                                        <Label>Primary Color</Label>
                                        <Input type="color" {...register('portalPrimaryColor')} className="h-10" />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* SECURITY */}
                        <TabsContent value="security" className="space-y-6 mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Security</CardTitle>
                                    <CardDescription>Encryption & expiry</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between ">
                                        <Label>Hash Encryption</Label>
                                        <Controller
                                            name="useHashEncryption"
                                            control={control}
                                            render={({ field }) => (
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className='flex flex-col gap-2.5'>

                                        <Label>Algorithm</Label>
                                        <Select value={watched.hashAlgorithm} onValueChange={(v) => setValue('hashAlgorithm', v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="SHA256">SHA-256</SelectItem>
                                                <SelectItem value="SHA512">SHA-512</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className='flex flex-col gap-2.5'>

                                        <Label>Validity Days</Label>
                                        <Input
                                            type="number"
                                            {...register('qrValidityDays', { valueAsNumber: true })}
                                            placeholder="No expiry"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* LIVE PREVIEW */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Eye className="w-5 h-5" />
                                Live Preview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed text-center min-h-[200px] flex items-center justify-center">
                                {qrPreview ? (
                                    <img src={qrPreview} alt="QR" className="mx-auto" style={{ width: watched.qrSize }} />
                                ) : (
                                    <p className="text-muted-foreground">Enable fields</p>
                                )}
                            </div>
                            {sampleData.student && (
                                <p className="text-xs text-muted-foreground mt-4">
                                    <strong>Student:</strong> {sampleData.student.name}
                                </p>
                            )}
                            {sampleData.certificate && (
                                <p className="text-xs text-muted-foreground">
                                    <strong>Cert #:</strong> {sampleData.certificate.certificateNumber}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
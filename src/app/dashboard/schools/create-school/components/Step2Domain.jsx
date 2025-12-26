'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import debounce from 'lodash.debounce';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, RefreshCcw, Copy, Check } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const step2Schema = z.object({
    domainMode: z.enum(['tenant', 'custom']),
    tenantName: z.string().optional(),
    customDomain: z.string().optional(),
    schoolCode: z.string().min(1, 'School code is required'),
    generateWebsite: z.boolean(),
}).refine(
    (data) => {
        if (data.domainMode === 'tenant') return !!data.tenantName?.trim();
        if (data.domainMode === 'custom') return !!data.customDomain?.trim();
        return true;
    },
    (data) => ({
        message: 'Domain is required',
        path: [data.domainMode === 'custom' ? 'customDomain' : 'tenantName'],
    })
);

export default function Step2Domain({ data, updateFormData, nextStep }) {
    const [checking, setChecking] = useState(false);
    const [available, setAvailable] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const form = useForm({
        resolver: zodResolver(step2Schema),
        defaultValues: {
            domainMode: data.domainMode || 'tenant',
            tenantName: data.tenantName || '',
            customDomain: data.customDomain || '',
            schoolCode: data.schoolCode || '',
            generateWebsite: data.generateWebsite || false,
        },
    });

    const subdomain = useWatch({ control: form.control, name: 'tenantName' });
    const domainMode = useWatch({ control: form.control, name: 'domainMode' });

    const checkDomain = debounce(async (val) => {
        if (!val) return;
        setChecking(true);
        setAvailable(null);

        const res = await fetch(`/api/check-domain?subdomain=${val}`);
        const { exists } = await res.json();

        setChecking(false);

        if (exists) {
            setAvailable(false);
            form.setError('tenantName', {
                type: 'manual',
                message: 'Domain already exists',
            });
        } else {
            setAvailable(true);
            form.clearErrors('tenantName');
        }
    }, 500);

    useEffect(() => {
        if (!subdomain || subdomain.trim() === '') {
            setAvailable(null);
            form.clearErrors('tenantName');
            return;
        }

        checkDomain(subdomain);
        return () => checkDomain.cancel();
    }, [subdomain]);

    const generateSchoolCode = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/schools/schoolcodegenerate');
            if (!res.ok) throw new Error('Failed to generate school code');
            const { code } = await res.json();
            form.setValue('schoolCode', code, {
                shouldDirty: true,
                shouldValidate: true,
            });
        } catch (error) {
            console.error('Error generating school code:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(`EB-${form.getValues('schoolCode')}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const onSubmit = (formValues) => {
        updateFormData(formValues);
        nextStep();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Domain Mode */}
                <FormField
                    control={form.control}
                    name="domainMode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Domain Option *</FormLabel>
                            <RadioGroup
                                defaultValue={field.value}
                                onValueChange={field.onChange}
                                className="flex space-x-4"
                            >
                                <FormItem className="flex items-center space-x-2">
                                    <RadioGroupItem value="tenant" id="tenant" />
                                    <Label htmlFor="tenant">Tenant (subdomain)</Label>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2">
                                    <RadioGroupItem value="custom" id="custom" />
                                    <Label htmlFor="custom">Custom Domain</Label>
                                </FormItem>
                            </RadioGroup>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Tenant Name */}
                {domainMode === 'tenant' && (
                    <FormField
                        control={form.control}
                        name="tenantName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>School Domain *</FormLabel>
                                <FormControl>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                placeholder="e.g. sunshine"
                                                {...field}
                                                className={form.formState.errors.tenantName ? 'border-red-500' : ''}
                                            />
                                            <span className="text-muted-foreground text-sm">.edubreezy.com</span>
                                            {available === true && (
                                                <CheckCircle className="text-green-500 h-5 w-5" />
                                            )}
                                            {available === false && (
                                                <XCircle className="text-red-500 h-5 w-5" />
                                            )}
                                        </div>

                                        {checking && (
                                            <p className="text-sm text-muted-foreground">
                                                Checking domain availability...
                                            </p>
                                        )}

                                        {available === true && !checking && (
                                            <p className="text-sm text-green-600">Domain is available 🎉</p>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {/* Custom Domain */}
                {domainMode === 'custom' && (
                    <FormField
                        control={form.control}
                        name="customDomain"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Custom Domain *</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. school.edu" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {/* School Code */}
                <FormField
                    control={form.control}
                    name="schoolCode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>School Code *</FormLabel>
                            <FormControl>
                                <div className="flex flex-row gap-2 items-center">
                                    <div className="pointer-events-none py-1 px-3.5 border rounded-lg w-16 flex items-center justify-center bg-muted">
                                        <span className="text-black/55 dark:text-gray-200 text-lg">EB-</span>
                                    </div>

                                    <Input
                                        readOnly
                                        value={field.value}
                                        className="flex-1 cursor-default"
                                        placeholder="Generate"
                                    />

                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        onClick={generateSchoolCode}
                                        disabled={loading}
                                    >
                                        <RefreshCcw className="w-4 h-4" />
                                    </Button>

                                    {field.value && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleCopy}
                                        >
                                            {copied ? (
                                                <Check className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Generate Website Checkbox */}
                <FormField
                    control={form.control}
                    name="generateWebsite"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>Generate School Website</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                    Automatically create a default website for this school.
                                </p>
                            </div>
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full">
                    Next
                </Button>
            </form>
        </Form>
    );
}

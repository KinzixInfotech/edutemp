'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import LoaderPage from '@/components/loader-page';
import { toast } from 'sonner';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { numberToWordsIndian } from '@/lib/utils';

// Schema aligned with API
const schema = z.object({
    name: z.string().min(1, 'Fee structure name is required'),
    installment: z.boolean(),
    classId: z.string().transform((val, ctx) => {
        const parsed = parseInt(val);
        if (isNaN(parsed) || parsed <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Invalid class ID',
            });
            return z.NEVER;
        }
        return parsed;
    }), // Transform string to number
    mode: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'], {
        message: 'Invalid fee mode',
    }),
    fees: z
        .array(
            z.object({
                name: z.string().min(1, 'Fee particular name is required'),
                amount: z.number().positive('Fee amount must be positive'),
            })
        )
        .min(1, 'At least one fee particular is required'),
});



export default function FeeStructureTableForm() {
    const { fullUser, loading } = useAuth();
    const [classes, setClasses] = useState([]);
    const [activeAcademicYear, setActiveAcademicYear] = useState(null);
    const [fetching, setFetching] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            classId: '',
            installment: false,
            mode: 'MONTHLY',
            fees: [{ name: '', amount: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'fees',
    });

    // Calculate total with memoization
    const total = form
        .watch('fees')
        ?.reduce((sum, f) => sum + (Number.isFinite(f.amount) ? f.amount : 0), 0);

    // Fetch classes and active academic year
    const fetchData = useCallback(async () => {
        if (!fullUser?.schoolId) return;
        setFetching(true);
        try {
            const [classesRes, yearsRes] = await Promise.all([
                fetch(`/api/schools/${fullUser.schoolId}/classes`),
                fetch(`/api/schools/academic-years?schoolId=${fullUser.schoolId}`),
            ]);

            if (!classesRes.ok) throw new Error('Failed to fetch classes');
            if (!yearsRes.ok) throw new Error('Failed to fetch academic years');

            const [classesData, yearsData] = await Promise.all([
                classesRes.json(),
                yearsRes.json(),
            ]);

            // const mappedClasses = (Array.isArray(classesData) ? classesData : []).map(
            //     (cls) => ({
            //         label: `Class ${cls.className +"'"+cls.sections.name}`,

            //         value: cls.id.toString(),
            //         classId: cls.id,
            //     })
            // );
            const mapped = (Array.isArray(classesData) ? classesData : []).flatMap((cls) => {
                if (Array.isArray(cls.sections) && cls.sections.length > 0) {
                    return cls.sections.map((sec) => ({
                        label: `${cls.className}'${sec.name}`,
                        value: `${cls.id}-${sec.id}`,
                        classId: cls.id,
                        sectionId: sec.id,
                    }));
                }
                return {
                    label: `Class ${cls.className}`,
                    value: `${cls.id}`,
                    classId: cls.id,
                    sectionId: null,
                };
            });
            setClasses(mapped);

            const activeYear = (yearsData || []).find((year) => year.isActive);
            setActiveAcademicYear(activeYear || null);
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error(err.message || 'Failed to load data');
        } finally {
            setFetching(false);
        }
    }, [fullUser]);

    useEffect(() => {
        if (!fullUser?.schoolId) return;

        if (classes.length > 0 && activeAcademicYear) return; // data already fetched

        fetchData();
    }, [fullUser?.schoolId]);

    const onSubmit = async (values) => {
        if (!fullUser?.schoolId) {
            toast.error('School not found');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                name: values.name,
                schoolId: fullUser.schoolId,
                classId: values.classId, // Already transformed to number
                mode: values.mode,
                installment: values.installment,
                fees: values.fees,
            };

            const res = await fetch('/api/schools/fee/structures', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add auth token if required: 'Authorization': `Bearer ${fullUser.token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to create fee structure');
            }

            toast.success('Fee structure created successfully');
            form.reset({
                name: '',
                classId: '',
                mode: 'MONTHLY',
                fees: [{ name: '', amount: 0 }],
            });
        } catch (err) {
            console.error('Submit error:', err);
            toast.error(err.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || fetching) {
        return <LoaderPage showmsg={false} />;
    }

    return (
        <div className="p-6 flex justify-center">
            <Card className="w-full max-w-4xl shadow-none rounded-xl bg-muted dark:bg-[#18181b] border-none">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Create Fee Structure</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="flex lg:flex-row flex-col gap-3.5 w-full justify-between">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Fee Structure Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter name (e.g., Tuition Fees)"
                                                    {...field}
                                                    className="dark:bg-[#171717] bg-white"
                                                    aria-label="Fee structure name"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="classId"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Choose Class</FormLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                aria-label="Select class"
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="w-full dark:bg-[#171717] bg-white">
                                                        <SelectValue placeholder="Select Class" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {classes.length > 0 ? (
                                                        classes.map((cls) => (
                                                            <SelectItem key={cls.value} value={cls.value}>
                                                                {cls.label}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="p-2 font-semibold">
                                                            <Link
                                                                href="/dashboard/schools/classes"
                                                                className="text-muted-foreground flex flex-row items-center font-normal text-sm justify-center"
                                                            >
                                                                Create Class <Plus size={14} />
                                                            </Link>
                                                        </div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="mode"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormLabel>Fee Mode</FormLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                aria-label="Select fee mode"
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="w-full dark:bg-[#171717] bg-white">
                                                        <SelectValue placeholder="Select Mode" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'].map((m) => (
                                                        <SelectItem key={m} value={m}>
                                                            {m}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                            </div>
                            <FormField
                                control={form.control}
                                name="installment"
                                render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2">
                                        <FormLabel className="m-0">Installment</FormLabel>
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}           // boolean
                                                onCheckedChange={(checked) => field.onChange(!!checked)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {activeAcademicYear && (
                                <div className="text-sm">
                                    <span className="font-medium">Active Academic Year:</span>{' '}
                                    {activeAcademicYear.name}
                                </div>
                            )}

                            {/* Total Installment Breakdown */}
                            {form.watch('installment') && (
                                <div className="mt-6 border rounded-lg overflow-hidden bg-white dark:bg-transparent">
                                    <div className='text-center bg-gray-50 dark:bg-gray-800 font-medium py-1'>Installment Breakdown</div>
                                    <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-800 text-sm font-medium px-4 py-2">
                                        <div className="col-span-6">Total Amount</div>
                                        <div className="col-span-6">Installments ({form.watch('mode')})</div>
                                    </div>
                                    <div className="grid grid-cols-12 gap-2.5 items-center px-4 py-2 border-t text-sm">
                                        <div className="col-span-6 font-medium">
                                            ₹{Number.isFinite(total) ? total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                            <div
                                                className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-h-16 overflow-auto break-words p-1"
                                                style={{ wordBreak: 'break-word' }}
                                            >
                                                {Number.isFinite(total) ? numberToWordsIndian(total) : ''}
                                            </div>
                                        </div>
                                        <div className="col-span-6">
                                            <div className="flex flex-wrap gap-2 max-h-20 overflow-auto">
                                                {(() => {
                                                    let installmentsCount = 1;
                                                    let prefix = '';
                                                    switch (form.watch('mode')) {
                                                        case 'MONTHLY':
                                                            installmentsCount = 12;
                                                            prefix = 'M';
                                                            break;
                                                        case 'QUARTERLY':
                                                            installmentsCount = 4;
                                                            prefix = 'Q';
                                                            break;
                                                        case 'HALF_YEARLY':
                                                            installmentsCount = 2;
                                                            prefix = 'H';
                                                            break;
                                                        case 'YEARLY':
                                                            installmentsCount = 1;
                                                            prefix = 'Y';
                                                            break;
                                                    }

                                                    if (!Number.isFinite(total)) return null;

                                                    const baseAmount = Math.floor((total / installmentsCount) * 100) / 100;
                                                    const lastAmount = (total - baseAmount * (installmentsCount - 1)).toFixed(2);

                                                    return Array.from({ length: installmentsCount }).map((_, i) => {
                                                        const amount = i === installmentsCount - 1 ? lastAmount : baseAmount.toFixed(2);
                                                        return (
                                                            <span
                                                                key={i}
                                                                className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium"
                                                            >
                                                                {i + 1}. {prefix}{i + 1} ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}



                            <div className="border rounded-lg overflow-hidden bg-white dark:bg-transparent">
                                <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-800 text-sm font-medium px-4 py-2">
                                    <div className="col-span-6">Fee Particulars</div>
                                    <div className="col-span-4">Amount</div>
                                    <div className="col-span-2 text-center">Actions</div>
                                </div>
                                {fields.map((field, index) => (
                                    <div
                                        key={field.id}
                                        className="grid grid-cols-12 gap-2.5 items-center px-4 py-2 border-t"
                                    >
                                        <div className="col-span-6">
                                            <FormField
                                                control={form.control}
                                                name={`fees.${index}.name`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Enter fee particular (e.g., Tuition)"
                                                                {...field}
                                                                className="dark:bg-[#171717] bg-white"
                                                                aria-label={`Fee particular ${index + 1}`}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <FormField
                                                control={form.control}
                                                name={`fees.${index}.amount`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                inputMode="decimal"
                                                                placeholder="0.00"
                                                                {...field}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    field.onChange(value === '' ? '' : parseFloat(value));
                                                                }}
                                                                className="dark:bg-[#171717] bg-white"
                                                                aria-label={`Amount for fee particular ${index + 1}`}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <div className="col-span-2 flex justify-center">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                aria-label={`Remove fee particular ${index + 1}`}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="lg:w-fit w-full"
                                onClick={() => append({ name: '', amount: 0 })}
                                aria-label="Add new fee particular"
                            >
                                + Add Fee
                            </Button>

                            <div className="flex justify-between items-center pt-4">
                                <span className="text-lg font-normal">
                                    Total:{' '}
                                    <span className="font-semibold">
                                        ₹{Number.isFinite(total) ? total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                    </span>
                                    <div className="col-span-6 font-medium">
                                        <div
                                            className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-full max-h-16 overflow-auto break-words p-1 mr-10"
                                            style={{ wordBreak: 'break-word' }}
                                        >
                                            {Number.isFinite(total) ? numberToWordsIndian(total) : ''}
                                        </div>
                                    </div>

                                </span>
                                <Button
                                    type="submit"
                                    className="bg-blue-600 text-white"
                                    disabled={submitting || fetching}
                                    aria-label="Save fee structure"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save School Fees'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
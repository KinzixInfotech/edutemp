'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemo } from 'react';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, addYears } from 'date-fns';
import { CalendarIcon, Calculator, Users, IndianRupee, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Pricing constants
const PRICE_PER_UNIT = 12000; // ₹12,000 per 100 students / year
const BASE_PRICE_PER_UNIT = 17143; // ₹17,143 before discount
const STUDENTS_PER_UNIT = 100;
const SOFT_BUFFER_PERCENT = 5; // 5% buffer

const step5Schema = z.object({
    expectedStudents: z.coerce.number()
        .min(1, 'Expected students is required')
        .max(50000, 'Maximum 50,000 students supported'),
    billingStartDate: z.date({
        required_error: 'Billing start date is required',
    }),
    isTrial: z.boolean(),
    trialDays: z.coerce.number().optional(),
}).refine(
    (data) => {
        if (data.isTrial && (!data.trialDays || data.trialDays < 7)) {
            return false;
        }
        return true;
    },
    {
        message: 'Trial period must be at least 7 days',
        path: ['trialDays'],
    }
);

export default function Step5ERPPlan({ data, updateFormData, nextStep }) {
    const form = useForm({
        resolver: zodResolver(step5Schema),
        defaultValues: {
            expectedStudents: data.expectedStudents || 100,
            billingStartDate: data.billingStartDate ? new Date(data.billingStartDate) : new Date(),
            isTrial: data.isTrial || false,
            trialDays: data.trialDays || 30,
        },
        mode: 'onChange',
    });

    const expectedStudents = useWatch({ control: form.control, name: 'expectedStudents' });
    const billingStartDate = useWatch({ control: form.control, name: 'billingStartDate' });
    const isTrial = useWatch({ control: form.control, name: 'isTrial' });

    // Auto-calculations
    const calculations = useMemo(() => {
        const students = Number(expectedStudents) || 0;
        const units = Math.ceil(students / STUDENTS_PER_UNIT);
        const includedCapacity = units * STUDENTS_PER_UNIT;
        const softCapacity = Math.floor(includedCapacity * (1 + SOFT_BUFFER_PERCENT / 100));
        const yearlyAmount = units * PRICE_PER_UNIT;
        const baseAmount = units * BASE_PRICE_PER_UNIT;
        const discount = baseAmount - yearlyAmount;
        const billingEndDate = billingStartDate ? addYears(new Date(billingStartDate), 1) : null;

        return {
            units,
            includedCapacity,
            softCapacity,
            yearlyAmount,
            baseAmount,
            discount,
            billingEndDate,
            perStudentYearly: students > 0 ? Math.round(yearlyAmount / students) : 0,
        };
    }, [expectedStudents, billingStartDate]);

    const onSubmit = (formValues) => {
        updateFormData({
            ...formValues,
            // Calculated values
            unitsPurchased: calculations.units,
            includedCapacity: calculations.includedCapacity,
            softCapacity: calculations.softCapacity,
            yearlyAmount: calculations.yearlyAmount,
            billingEndDate: calculations.billingEndDate,
        });
        nextStep();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                            <p className="font-medium text-blue-900 dark:text-blue-300">
                                Assign ERP Plan & Capacity
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                As Super Admin, you control the student capacity and billing for this school.
                                Schools cannot modify these settings.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pricing Info */}
                <div className="bg-muted/50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium">Current Pricing</p>
                            <p className="text-xs text-muted-foreground">Early Access Discount Applied (30% off)</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold text-green-600">₹12,000</p>
                            <p className="text-xs text-muted-foreground line-through">₹17,143</p>
                            <p className="text-xs text-muted-foreground">per 100 students / year</p>
                        </div>
                    </div>
                </div>

                {/* Expected Students Input */}
                <FormField
                    control={form.control}
                    name="expectedStudents"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Expected Student Count *</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        placeholder="e.g., 500"
                                        className="pl-10"
                                        {...field}
                                    />
                                </div>
                            </FormControl>
                            <FormDescription>
                                Enter the estimated number of students for this school
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Auto-calculated Values */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Units */}
                    <Card className="border-dashed">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Calculator className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Units Required</span>
                            </div>
                            <p className="text-2xl font-bold">{calculations.units}</p>
                            <p className="text-xs text-muted-foreground">1 unit = 100 students</p>
                        </CardContent>
                    </Card>

                    {/* Included Capacity */}
                    <Card className="border-dashed">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Included Capacity</span>
                            </div>
                            <p className="text-2xl font-bold">{calculations.includedCapacity.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                                +5% buffer = {calculations.softCapacity.toLocaleString()} max
                            </p>
                        </CardContent>
                    </Card>

                    {/* Yearly Amount */}
                    <Card className="border-dashed bg-green-50/50 dark:bg-green-900/10">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <IndianRupee className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-muted-foreground">Yearly Amount</span>
                            </div>
                            <p className="text-2xl font-bold text-green-600">
                                ₹{calculations.yearlyAmount.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                You save ₹{calculations.discount.toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Per Student Cost */}
                    <Card className="border-dashed">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                                <IndianRupee className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Per Student / Year</span>
                            </div>
                            <p className="text-2xl font-bold">₹{calculations.perStudentYearly}</p>
                            <p className="text-xs text-muted-foreground">Effective rate</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Billing Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="billingStartDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Billing Start Date *</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    'w-full pl-3 text-left font-normal',
                                                    !field.value && 'text-muted-foreground'
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, 'PPP')
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date()}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Billing End Date (Read-only) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Billing End Date</label>
                        <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
                            <span className="text-sm">
                                {calculations.billingEndDate
                                    ? format(calculations.billingEndDate, 'PPP')
                                    : '-'}
                            </span>
                            <Badge variant="secondary" className="ml-auto text-xs">Auto</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">1 year from start date</p>
                    </div>
                </div>

                {/* Trial Toggle */}
                <FormField
                    control={form.control}
                    name="isTrial"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Start with Trial Period</FormLabel>
                                <FormDescription>
                                    Allow school to trial before billing begins
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {/* Trial Days (conditional) */}
                {isTrial && (
                    <FormField
                        control={form.control}
                        name="trialDays"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Trial Duration (Days) *</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min={7}
                                        max={90}
                                        placeholder="30"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Minimum 7 days, maximum 90 days
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {/* Capacity Warning */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                            <p className="font-medium text-amber-900 dark:text-amber-300 text-sm">
                                Capacity Enforcement
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                School can add up to <strong>{calculations.softCapacity.toLocaleString()}</strong> students (includes 5% buffer).
                                Exceeding this will require an upgrade request to Super Admin.
                            </p>
                        </div>
                    </div>
                </div>

                <Button type="submit" className="w-full">
                    Next
                </Button>
            </form>
        </Form>
    );
}

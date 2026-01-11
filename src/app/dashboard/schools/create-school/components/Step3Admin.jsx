'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

const step3Schema = z.object({
    adminName: z.string()
        .min(2, 'Admin name must be at least 2 characters')
        .max(50, 'Admin name cannot exceed 50 characters'),
    adminEmail: z.string()
        .email('Please enter a valid email address')
        .min(1, 'Email is required'),
    adminPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
});

export default function Step3Admin({ data, updateFormData, nextStep }) {
    const form = useForm({
        resolver: zodResolver(step3Schema),
        defaultValues: {
            adminName: data.adminName || '',
            adminEmail: data.adminEmail || '',
            adminPassword: data.adminPassword || '',
        },
        mode: 'onChange', // Enable live validation
    });

    const onSubmit = (formValues) => {
        updateFormData(formValues);
        nextStep();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-900 dark:text-blue-300">
                        Create an admin account that will have full access to manage this school.
                    </p>
                </div>

                {/* Admin Name */}
                <FormField
                    control={form.control}
                    name="adminName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Admin Name *</FormLabel>
                            <FormControl>
                                <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Admin Email */}
                <FormField
                    control={form.control}
                    name="adminEmail"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Admin Email *</FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    placeholder="admin@school.com"
                                    {...field}
                                    className={form.formState.errors.adminEmail ? 'border-red-500' : ''}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Admin Password */}
                <FormField
                    control={form.control}
                    name="adminPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Admin Password *</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
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

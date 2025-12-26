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
    adminName: z.string().min(1, 'Admin name is required'),
    adminem: z.string().email('Invalid email'),
    adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function Step3Admin({ data, updateFormData, nextStep }) {
    const form = useForm({
        resolver: zodResolver(step3Schema),
        defaultValues: {
            adminName: data.adminName || '',
            adminem: data.adminem || '',
            adminPassword: data.adminPassword || '',
        },
    });

    const onSubmit = (formValues) => {
        updateFormData(formValues);
        nextStep();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-900">
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
                    name="adminem"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Admin Email *</FormLabel>
                            <FormControl>
                                <Input placeholder="admin@school.com" {...field} />
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

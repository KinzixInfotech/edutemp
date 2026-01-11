'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const step4Schema = z.object({
    directorName: z.string()
        .min(2, 'Director name must be at least 2 characters')
        .max(50, 'Director name cannot exceed 50 characters'),
    directorEmail: z.string()
        .email('Please enter a valid email address')
        .min(1, 'Email is required'),
    directorPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase and number'),
    createPrincipal: z.boolean(),
    // Principal fields - no min validation here, handled in superRefine
    principalName: z.string().optional().or(z.literal('')),
    principalEmail: z.string().optional().or(z.literal('')),
    principalPassword: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
    // Only validate principal fields if createPrincipal is true
    if (data.createPrincipal) {
        if (!data.principalName || data.principalName.trim().length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Principal name must be at least 2 characters',
                path: ['principalName'],
            });
        }
        if (!data.principalEmail || !data.principalEmail.includes('@')) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Please enter a valid email address',
                path: ['principalEmail'],
            });
        }
        if (!data.principalPassword || data.principalPassword.length < 8) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Principal password must be at least 8 characters',
                path: ['principalPassword'],
            });
        }
    }
});

export default function Step4Director({ data, updateFormData, nextStep }) {
    const form = useForm({
        resolver: zodResolver(step4Schema),
        defaultValues: {
            directorName: data.directorName || '',
            directorEmail: data.directorEmail || '',
            directorPassword: data.directorPassword || '',
            createPrincipal: data.createPrincipal || false,
            principalName: data.principalName || '',
            principalEmail: data.principalEmail || '',
            principalPassword: data.principalPassword || '',
        },
        mode: 'onChange', // Enable live validation
    });

    const createPrincipal = useWatch({ control: form.control, name: 'createPrincipal' });

    const onSubmit = (formValues) => {
        updateFormData(formValues);
        nextStep();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Director Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                        <h3 className="text-lg font-semibold">Director Profile</h3>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                        <p className="text-sm text-purple-900 dark:text-purple-300">
                            The Director will have authority to approve payroll and library requests.
                        </p>
                    </div>

                    {/* Director Name */}
                    <FormField
                        control={form.control}
                        name="directorName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Director Name *</FormLabel>
                                <FormControl>
                                    <Input placeholder="Jane Smith" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Director Email */}
                    <FormField
                        control={form.control}
                        name="directorEmail"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Director Email *</FormLabel>
                                <FormControl>
                                    <Input placeholder="director@school.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Director Password */}
                    <FormField
                        control={form.control}
                        name="directorPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Director Password *</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Principal Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b">
                        <h3 className="text-lg font-semibold">Principal (Optional)</h3>
                    </div>

                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Only <strong>one Principal</strong> can be assigned per school. You can create the principal now or add them later.
                        </AlertDescription>
                    </Alert>

                    {/* Create Principal Toggle */}
                    <FormField
                        control={form.control}
                        name="createPrincipal"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>Create Principal Now</FormLabel>
                                    <FormDescription>
                                        Set up the principal profile during school creation
                                    </FormDescription>
                                </div>
                            </FormItem>
                        )}
                    />

                    {/* Principal Fields (conditional) */}
                    {createPrincipal && (
                        <div className="space-y-4 pl-4 border-l-2 border-blue-200">
                            {/* Principal Name */}
                            <FormField
                                control={form.control}
                                name="principalName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Principal Name *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Robert Johnson" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Principal Email */}
                            <FormField
                                control={form.control}
                                name="principalEmail"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Principal Email *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="principal@school.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Principal Password */}
                            <FormField
                                control={form.control}
                                name="principalPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Principal Password *</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
                </div>

                <Button type="submit" className="w-full">
                    Next
                </Button>
            </form>
        </Form>
    );
}

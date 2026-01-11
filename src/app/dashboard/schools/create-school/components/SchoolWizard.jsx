'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, ArrowLeft, School } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

// Step Components
import Step1BasicInfo from './Step1BasicInfo';
import Step2Domain from './Step2Domain';
import Step3Admin from './Step3Admin';
import Step4Director from './Step4Director';
import Step5ERPPlan from './Step5ERPPlan';
import Step6Review from './Step6Review';

const STEPS = [
    { id: 1, name: 'School Info', component: Step1BasicInfo },
    { id: 2, name: 'Domain', component: Step2Domain },
    { id: 3, name: 'Admin', component: Step3Admin },
    { id: 4, name: 'Director', component: Step4Director },
    { id: 5, name: 'ERP Plan', component: Step5ERPPlan },
    { id: 6, name: 'Review', component: Step6Review },
];

export default function SchoolWizard() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        // School Basic Info
        name: '',
        email: '',
        phone: '',
        location: '',
        profilePicture: '',
        subscriptionType: 'A',
        language: 'en',

        // Domain
        domainMode: 'tenant',
        tenantName: '',
        customDomain: '',
        schoolCode: '',
        generateWebsite: false,

        // Admin
        adminName: '',
        adminEmail: '',
        adminPassword: '',

        // Director
        directorName: '',
        directorEmail: '',
        directorPassword: '',

        // Principal (optional)
        createPrincipal: false,
        principalName: '',
        principalEmail: '',
        principalPassword: '',

        // ERP Plan & Capacity (Super Admin controlled)
        expectedStudents: 100,
        unitsPurchased: 1,
        includedCapacity: 100,
        softCapacity: 105,
        yearlyAmount: 10500,
        billingStartDate: null,
        billingEndDate: null,
        isTrial: false,
        trialDays: 30,
    });

    const createSchoolMutation = useMutation({
        mutationFn: async (data) => {
            const domain =
                data.domainMode === 'tenant'
                    ? `${data.tenantName?.toLowerCase().replace(/\s+/g, '')}.edubreezy.com`
                    : data.customDomain;

            const payload = {
                ...data,
                resolvedDomain: domain,
            };

            const res = await fetch('/api/schools/create-school', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create school');
            }

            return res.json();
        },
        onSuccess: () => {
            toast.success('School created successfully!');
            router.push('/dashboard/schools/all-schools');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create school');
        },
    });

    const updateFormData = (data) => {
        setFormData((prev) => ({ ...prev, ...data }));
    };

    const nextStep = () => {
        if (currentStep < STEPS.length) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    const handleSubmit = () => {
        createSchoolMutation.mutate(formData);
    };

    const CurrentStepComponent = STEPS[currentStep - 1].component;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <School className="w-8 h-8 text-blue-600" />
                        Create New School
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Complete all steps to register a new school on EduBreezy
                    </p>
                </div>
                <Link href="/dashboard/schools/all-schools">
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Schools
                    </Button>
                </Link>
            </div>
            <Separator />
            <div className="max-w-5xl mx-auto">
                {/* Stepper Progress Indicator */}
                <div className="mb-10">
                    <div className="flex items-center justify-center gap-0">
                        {STEPS.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <div className="flex flex-col items-center">
                                    {/* Step Circle */}
                                    <div className="relative">
                                        <div
                                            className={cn(
                                                'w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2',
                                                currentStep > step.id
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                                    : currentStep === step.id
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-110 ring-4 ring-blue-200 dark:ring-blue-900'
                                                        : 'bg-background border-muted-foreground/30 text-muted-foreground shadow-sm'
                                            )}
                                        >
                                            {currentStep > step.id ? (
                                                <Check className="w-6 h-6" />
                                            ) : (
                                                <span>{step.id}</span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Step Label */}
                                    <span
                                        className={cn(
                                            'mt-3 text-sm font-semibold whitespace-nowrap transition-colors',
                                            currentStep >= step.id
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-muted-foreground'
                                        )}
                                    >
                                        {step.name}
                                    </span>
                                </div>
                                {/* Connector Line */}
                                {index < STEPS.length - 1 && (
                                    <div className="flex items-center px-4 pb-8">
                                        <div
                                            className={cn(
                                                'h-1 w-20 transition-all duration-300 rounded-full',
                                                currentStep > step.id ? 'bg-blue-600' : 'bg-muted'
                                            )}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step Content Card */}
                <Card className="shadow-lg">
                    <CardHeader className="border-b">
                        <CardTitle className="text-lg font-semibold">
                            {STEPS[currentStep - 1].name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <CurrentStepComponent
                            data={formData}
                            updateFormData={updateFormData}
                            nextStep={nextStep}
                        />
                    </CardContent>
                </Card>

                {/* Navigation Buttons */}
                <div className="mt-8 flex justify-between">
                    <Button
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 1 || createSchoolMutation.isPending}
                        className="px-6"
                    >
                        ← Back
                    </Button>

                    {/* Only show Create School button on the final step (Review) */}
                    {/* Steps 1-4 have their own form submit buttons with Zod validation */}
                    {currentStep === STEPS.length && (
                        <Button
                            onClick={handleSubmit}
                            disabled={createSchoolMutation.isPending}
                            className="px-8 bg-green-600 hover:bg-green-700"
                        >
                            {createSchoolMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating School...
                                </>
                            ) : (
                                '✓ Create School'
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

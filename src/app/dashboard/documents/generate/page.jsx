'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Award,
    ChevronRight,
    FileCheck,
    FileText,
    Medal,
    ScrollText,
    Sparkles,
    Trophy,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CERTIFICATE_OPTIONS = [
    {
        type: 'character',
        title: 'Character Certificate',
        description: 'Verify conduct and character with student record mapping.',
        icon: Award,
        audience: 'Admin, Teacher',
    },
    {
        type: 'bonafide',
        title: 'Bonafide Certificate',
        description: 'Issue study or bonafide letters using the selected template.',
        icon: FileCheck,
        audience: 'Admin, Teacher',
    },
    {
        type: 'transfer',
        title: 'Transfer Certificate',
        description: 'Generate TC documents after validating student and leaving data.',
        icon: ScrollText,
        audience: 'Admin',
    },
    {
        type: 'school-leaving',
        title: 'School Leaving Certificate',
        description: 'Use mapped school leaving templates with strict placeholder checks.',
        icon: FileText,
        audience: 'Admin',
    },
    {
        type: 'competition',
        title: 'Competition Certificate',
        description: 'Create event and achievement certificates with mapped student fields.',
        icon: Trophy,
        audience: 'Admin, Teacher',
    },
    {
        type: 'custom',
        title: 'Custom Certificate',
        description: 'Generate flexible certificates while still validating template mapping first.',
        icon: Sparkles,
        audience: 'Admin',
    },
];

export default function GenerateCertificatesHomePage() {
    const router = useRouter();

    const stats = useMemo(() => ([
        {
            title: 'Step 1',
            value: 'Choose Type',
            description: 'Pick the certificate flow you want to generate.',
        },
        {
            title: 'Step 2',
            value: 'Validate Template',
            description: 'Check mapping first so generation never breaks midway.',
        },
        {
            title: 'Step 3',
            value: 'Select Student',
            description: 'Only after mapping is ready, proceed to generate.',
        },
    ]), []);

    return (
        <div className="absolute inset-0 overflow-auto bg-background">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/dashboard/documents')}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                            <div className="h-5 w-px bg-border" />
                            <div className="flex items-center gap-2">
                                <Medal className="h-5 w-5 text-primary" />
                                <h1 className="text-xl font-semibold">Generate Certificates</h1>
                            </div>
                        </div>
                        <p className="max-w-3xl text-sm text-muted-foreground">
                            Start from one place, choose the certificate type, validate template mapping, then move to student generation only when the template is ready.
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => router.push('/dashboard/documents/templates/certificate')}>
                        Manage Templates
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {stats.map((item) => (
                        <Card key={item.title} className="gap-3 border-dashed">
                            <CardHeader className="pb-0">
                                <CardDescription>{item.title}</CardDescription>
                                <CardTitle className="text-lg">{item.value}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 text-sm text-muted-foreground">
                                {item.description}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {CERTIFICATE_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                            <Card
                                key={option.type}
                                className="group cursor-pointer gap-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
                                onClick={() => router.push(`/dashboard/documents/generate/${option.type}`)}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base">{option.title}</CardTitle>
                                                <CardDescription className="mt-1">{option.audience}</CardDescription>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0 text-sm text-muted-foreground">
                                    {option.description}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

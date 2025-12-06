'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Download, FileText, Calendar, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function AdmitCardDetailPage(props) {
    const params = use(props.params);
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const { id } = params;

    // Fetch admit card details
    const { data: admitCards, isLoading } = useQuery({
        queryKey: ['admit-card', id, schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const res = await fetch(`/api/documents/${schoolId}/admitcards/history?id=${id}`);
            if (!res.ok) throw new Error('Failed to fetch admit card');
            return res.json();
        },
        enabled: !!schoolId && !!id,
    });

    const admitCard = admitCards?.[0];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!admitCard) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <h2 className="text-xl font-semibold">Admit Card Not Found</h2>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    const { student, exam, layoutConfig } = admitCard;
    const fileUrl = layoutConfig?.fileUrl;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()} className="h-8 w-8 sm:h-9 sm:w-9">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0 text-primary" />
                            Admit Card Details
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                            {exam?.title} - {student?.name}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
                    {fileUrl ? (
                        <Button onClick={() => window.open(fileUrl, '_blank')} size="sm">
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                        </Button>
                    ) : (
                        <Button disabled variant="secondary" size="sm">
                            PDF Not Available
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Student Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground uppercase font-semibold">Name</span>
                            <span className="font-medium">{student?.name}</span>
                        </div>
                        <Separator />
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground uppercase font-semibold">Roll Number</span>
                            <span className="font-medium">{student?.rollNumber}</span>
                        </div>
                        <Separator />
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground uppercase font-semibold">Details</span>
                            <div className="text-sm space-y-1">
                                <p><span className="text-muted-foreground">Class:</span> {student?.class?.className} - {student?.section?.name}</p>
                                <p><span className="text-muted-foreground">Adm No:</span> {student?.admissionNo}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg">Admit Card Preview</CardTitle>
                        <CardDescription>
                            Generated on {format(new Date(admitCard.issueDate), 'PPP p')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 bg-muted/20 min-h-[400px] flex items-center justify-center p-4 rounded-b-lg">
                        {fileUrl ? (
                            <iframe
                                src={`${fileUrl}#toolbar=0`}
                                className="w-full h-[500px] rounded border bg-white shadow-sm"
                                title="Admit Card PDF"
                            />
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>Preview not available</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

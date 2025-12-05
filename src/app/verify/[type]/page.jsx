'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, FileText, Award, IdCard } from 'lucide-react';

export default function VerificationPage() {
    const params = useParams();
    const searchParams = useSearchParams();

    const type = params.type; // 'admitcard', 'certificate', 'idcard'
    const studentId = searchParams.get('studentId');
    const examId = searchParams.get('examId');
    const certificateId = searchParams.get('certificateId');
    const seat = searchParams.get('seat');

    // TanStack Query for verification data
    const { data, isLoading, error, isError } = useQuery({
        queryKey: ['verification', type, studentId, examId, certificateId],
        queryFn: async () => {
            let endpoint = '';
            if (type === 'admitcard') {
                endpoint = `/api/verify/admitcard?studentId=${studentId}&examId=${examId}`;
            } else if (type === 'certificate') {
                endpoint = `/api/verify/certificate?certificateId=${certificateId}`;
            } else if (type === 'idcard') {
                endpoint = `/api/verify/idcard?studentId=${studentId}`;
            }

            const response = await fetch(endpoint);
            if (!response.ok) throw new Error('Verification failed');
            return response.json();
        },
        enabled: !!type && !!(studentId || certificateId),
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    });

    const getIcon = () => {
        switch (type) {
            case 'admitcard': return <FileText className="h-12 w-12 text-blue-600" />;
            case 'certificate': return <Award className="h-12 w-12 text-green-600" />;
            case 'idcard': return <IdCard className="h-12 w-12 text-purple-600" />;
            default: return <FileText className="h-12 w-12" />;
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'admitcard': return 'Admit Card Verification';
            case 'certificate': return 'Certificate Verification';
            case 'idcard': return 'ID Card Verification';
            default: return 'Document Verification';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                        <p className="text-lg text-muted-foreground">Verifying document...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <XCircle className="h-16 w-16 text-red-600 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
                        <p className="text-muted-foreground text-center">{error?.message || 'Document could not be verified'}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br  pt-20 from-green-50 to-blue-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader className="text-center border-b bg-white/50 backdrop-blur">
                    <div className="flex justify-center mb-4">
                        {getIcon()}
                    </div>
                    <CardTitle className="text-3xl font-bold">{getTitle()}</CardTitle>
                    <CardDescription className="flex items-center justify-center gap-2 text-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <span className="text-green-700 font-semibold">Verified Successfully</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    {/* School Information */}
                    {data.school && (
                        <div className="border-b pb-4">
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3">SCHOOL INFORMATION</h3>
                            <div className="space-y-2">
                                <p className="text-lg font-semibold">{data.school.name}</p>
                                {data.school.location && (
                                    <p className="text-sm text-muted-foreground">{data.school.location}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Student Information */}
                    {data.student && (
                        <div className="border-b pb-4">
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3">STUDENT INFORMATION</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Name</p>
                                    <p className="font-semibold">{data.student.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Roll Number</p>
                                    <p className="font-semibold">{data.student.rollNumber || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Class</p>
                                    <p className="font-semibold">{data.student.className || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Section</p>
                                    <p className="font-semibold">{data.student.sectionName || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Admit Card Specific */}
                    {type === 'admitcard' && data.exam && (
                        <div className="border-b pb-4">
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3">EXAM INFORMATION</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Exam Name</p>
                                    <p className="font-semibold">{data.exam.title}</p>
                                </div>
                                {seat && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Seat Number</p>
                                        <p className="font-semibold">{seat}</p>
                                    </div>
                                )}
                                {data.exam.startDate && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Start Date</p>
                                        <p className="font-semibold">
                                            {new Date(data.exam.startDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Certificate Specific */}
                    {type === 'certificate' && data.certificate && (
                        <div className="border-b pb-4">
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3">CERTIFICATE DETAILS</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Certificate ID</p>
                                    <p className="font-semibold text-xs">{certificateId}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Issue Date</p>
                                    <p className="font-semibold">
                                        {new Date(data.certificate.issuedDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Verification Timestamp */}
                    <div className="bg-muted/30 rounded-lg p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Verified On</p>
                        <p className="text-sm font-semibold">{new Date().toLocaleString()}</p>
                    </div>

                    {/* Verification Badge */}
                    <div className="flex justify-center pt-4">
                        <Badge variant="default" className="px-6 py-2 text-sm bg-green-600">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Authentic Document
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

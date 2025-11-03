'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    Loader2,
    Award,
    ArrowLeft,
    Download,
    Printer,
    Mail,
    Trash2,
    CheckCircle,
    XCircle,
    Calendar,
    User,
    Hash,
    FileText
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';

export default function CertificatePreviewPage() {
    const router = useRouter();
    const params = useParams();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();
    const certificateId = params?.id;

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [emailSending, setEmailSending] = useState(false);

    // Fetch certificate details
    const { data: certificate, isLoading } = useQuery({
        queryKey: ['certificate', certificateId, schoolId],
        queryFn: async () => {
            if (!schoolId || !certificateId) throw new Error('Invalid parameters');
            const res = await fetch(`/api/documents/${schoolId}/certificates/${certificateId}`);
            if (!res.ok) throw new Error('Failed to fetch certificate');
            return res.json();
        },
        enabled: !!schoolId && !!certificateId,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/documents/${schoolId}/certificates/${certificateId}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Certificate deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['certificates'] });
            router.push('/dashboard/documents/certificates');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to delete certificate');
        },
    });

    // Email certificate
    const handleEmailCertificate = async () => {
        setEmailSending(true);
        try {
            const res = await fetch(`/api/documents/${schoolId}/certificates/${certificateId}/email`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to send email');
            toast.success('Certificate sent successfully');
        } catch (error) {
            toast.error(error.message || 'Failed to send email');
        } finally {
            setEmailSending(false);
        }
    };

    // Print certificate
    const handlePrint = () => {
        if (certificate?.fileUrl) {
            window.open(certificate.fileUrl, '_blank');
        }
    };

    if (!schoolId || !certificateId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Invalid Certificate</h2>
                    <p className="text-muted-foreground mb-4">The certificate ID is invalid or missing.</p>
                    <Button onClick={() => router.push('/dashboard/documents/certificates')}>
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.back()}
                            className="mr-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                            <Award className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0 text-primary" />
                            <span>Certificate Preview</span>
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground ml-10 sm:ml-12">
                        View and manage certificate details
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                    >
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEmailCertificate}
                        disabled={emailSending}
                    >
                        {emailSending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Mail className="mr-2 h-4 w-4" />
                        )}
                        Email
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = certificate?.fileUrl;
                            link.download = `${certificate?.certificateNumber}.pdf`;
                            link.click();
                        }}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Certificate Details */}
                <div className="lg:col-span-1 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg">Certificate Information</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Details and metadata
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Status Badge */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <Badge
                                    variant={certificate?.status === 'issued' ? 'default' : 'secondary'}
                                    className="capitalize"
                                >
                                    {certificate?.status === 'issued' && <CheckCircle className="w-3 h-3 mr-1" />}
                                    {certificate?.status === 'revoked' && <XCircle className="w-3 h-3 mr-1" />}
                                    {certificate?.status}
                                </Badge>
                            </div>

                            <Separator />

                            {/* Certificate Number */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Hash className="h-4 w-4" />
                                    <span>Certificate Number</span>
                                </div>
                                <p className="font-mono text-sm font-semibold">
                                    {certificate?.certificateNumber}
                                </p>
                            </div>

                            {/* Student Name */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    <span>Student Name</span>
                                </div>
                                <p className="font-medium text-sm">
                                    {certificate?.student?.name}
                                </p>
                            </div>

                            {/* Issue Date */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>Issue Date</span>
                                </div>
                                <p className="text-sm">
                                    {new Date(certificate?.issueDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>

                            {/* Template */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <FileText className="h-4 w-4" />
                                    <span>Template</span>
                                </div>
                                <p className="text-sm">
                                    {certificate?.template?.name}
                                </p>
                            </div>

                            {/* Issued By */}
                            {certificate?.issuedBy && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <User className="h-4 w-4" />
                                        <span>Issued By</span>
                                    </div>
                                    <p className="text-sm">
                                        {certificate?.issuedBy?.name}
                                    </p>
                                </div>
                            )}

                            <Separator />

                            {/* Custom Fields */}
                            {certificate?.customFields && Object.keys(certificate.customFields).length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold">Additional Details</h4>
                                    <div className="space-y-2">
                                        {Object.entries(certificate.customFields).map(([key, value]) => (
                                            <div key={key} className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground capitalize">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                                <span className="font-medium">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Separator />

                            {/* Actions */}
                            <div className="space-y-2">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => setShowDeleteDialog(true)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Certificate
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Certificate Preview */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg">Certificate Preview</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Full-size preview of the generated certificate
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {certificate?.fileUrl ? (
                                <div className="space-y-4">
                                    <iframe
                                        src={certificate.fileUrl}
                                        className="w-full h-[600px] sm:h-[700px] lg:h-[800px] border rounded-lg"
                                        title="Certificate Preview"
                                    />
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => window.open(certificate.fileUrl, '_blank')}
                                            className="flex-1"
                                        >
                                            Open in New Tab
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = certificate.fileUrl;
                                                link.download = `${certificate.certificateNumber}.pdf`;
                                                link.click();
                                            }}
                                            className="flex-1"
                                        >
                                            <Download className="mr-2 h-4 w-4" />
                                            Download PDF
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No Preview Available</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm">
                                        The certificate file could not be loaded. Please try regenerating the certificate.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base sm:text-lg">
                            Delete Certificate?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs sm:text-sm">
                            This action cannot be undone. This will permanently delete the certificate
                            <strong> {certificate?.certificateNumber}</strong> and remove it from all records.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                        <AlertDialogCancel className="m-0 w-full sm:w-auto">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteMutation.mutate()}
                            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Delete'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
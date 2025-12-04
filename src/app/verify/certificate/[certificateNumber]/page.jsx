import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Calendar, User, School, FileText } from 'lucide-react';
import Image from 'next/image';

export default async function VerifyCertificatePage({ params }) {
    const { certificateNumber } = params;

    let certificate = null;
    let error = null;

    try {
        certificate = await prisma.certificateGenerated.findUnique({
            where: { certificateNumber },
            include: {
                student: {
                    include: {
                        user: true,
                        class: true,
                        section: true
                    }
                },
                school: true,
                template: true
            }
        });
    } catch (err) {
        console.error('Error fetching certificate:', err);
        error = 'An error occurred while verifying the certificate.';
    }

    if (error || !certificate) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-red-200 shadow-lg">
                    <CardHeader className="text-center space-y-2">
                        <div className="mx-auto bg-red-100 p-3 rounded-full w-fit">
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <CardTitle className="text-xl text-red-700">Invalid Certificate</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-gray-600">
                        <p>The certificate with number <span className="font-mono font-bold">{certificateNumber}</span> could not be found or is invalid.</p>
                        <p className="mt-4 text-sm">Please check the number and try again.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Status Banner */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-semibold text-lg">Certificate Verified Successfully</span>
                </div>

                <Card className="shadow-xl border-t-4 border-t-blue-600">
                    <CardHeader className="text-center border-b bg-gray-50/50 pb-8">
                        <div className="flex justify-center mb-4">
                            {certificate.school.logo ? (
                                <img
                                    src={certificate.school.logo}
                                    alt={certificate.school.name}
                                    className="h-20 w-auto object-contain"
                                />
                            ) : (
                                <School className="h-16 w-16 text-gray-400" />
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">{certificate.school.name}</h1>
                        <p className="text-gray-500">{certificate.school.address}</p>
                        <div className="mt-6">
                            <Badge variant="outline" className="text-lg py-1 px-4 border-blue-200 bg-blue-50 text-blue-700">
                                {certificate.template.name}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <User className="w-4 h-4" /> Student Details
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-lg font-semibold">{certificate.student.user.name}</p>
                                        <p className="text-gray-600">Class: {certificate.student.class?.className} - {certificate.student.section?.sectionName}</p>
                                        <p className="text-gray-600">Roll No: {certificate.student.rollNumber}</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> Issue Details
                                    </h3>
                                    <div className="mt-2 space-y-1">
                                        <p className="text-gray-900">Issued on: {new Date(certificate.createdAt).toLocaleDateString()}</p>
                                        <p className="text-gray-600 font-mono text-sm">Cert No: {certificate.certificateNumber}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center space-y-4 bg-gray-50 rounded-lg p-6">
                                {certificate.student.user.profilePicture ? (
                                    <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md">
                                        <img
                                            src={certificate.student.user.profilePicture}
                                            alt={certificate.student.user.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                                        <User className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-900">Student Photo</p>
                                </div>
                            </div>
                        </div>

                        {/* Custom Fields if any */}
                        {certificate.customFields && Object.keys(certificate.customFields).length > 0 && (
                            <div className="border-t pt-6">
                                <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Additional Details
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {Object.entries(certificate.customFields).map(([key, value]) => (
                                        <div key={key} className="bg-gray-50 p-3 rounded border">
                                            <p className="text-xs text-gray-500 uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                            <p className="font-medium mt-1">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Download Button (if fileUrl exists) */}
                        {/* Note: fileUrl might be a data URI or a real URL. If data URI, it might be too large for href. */}
                        {/* Ideally we should have a download route. */}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

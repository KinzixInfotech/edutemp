// 'use client';

// import { useState } from 'react';
// import { useRouter, useParams } from 'next/navigation';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { toast } from 'sonner';
// import {
//     Loader2,
//     FileText,
//     ArrowLeft,
//     Download,
//     Printer,
//     Mail,
//     Trash2,
//     CheckCircle,
//     Calendar,
//     User,
//     Hash,
//     AlertCircle
// } from 'lucide-react';

// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import {
//     AlertDialog,
//     AlertDialogAction,
//     AlertDialogCancel,
//     AlertDialogContent,
//     AlertDialogDescription,
//     AlertDialogFooter,
//     AlertDialogHeader,
//     AlertDialogTitle,
// } from '@/components/ui/alert-dialog';
// import { Badge } from '@/components/ui/badge';
// import { Separator } from '@/components/ui/separator';
// import { useAuth } from '@/context/AuthContext';

// export default function AdmitCardPreviewPage() {
//     const router = useRouter();
//     const params = useParams();
//     const { fullUser } = useAuth();
//     const schoolId = fullUser?.schoolId;
//     const queryClient = useQueryClient();
//     const admitCardId = params?.id;

//     const [showDeleteDialog, setShowDeleteDialog] = useState(false);
//     const [emailSending, setEmailSending] = useState(false);

//     // Fetch admit card details
//     const { data: admitCard, isLoading } = useQuery({
//         queryKey: ['admitcard', admitCardId, schoolId],
//         queryFn: async () => {
//             if (!schoolId || !admitCardId) throw new Error('Invalid parameters');
//             const res = await fetch(`/api/documents/${schoolId}/admitcards/${admitCardId}`);
//             if (!res.ok) throw new Error('Failed to fetch admit card');
//             return res.json();
//         },
//         enabled: !!schoolId && !!admitCardId,
//     });

//     // Delete mutation
//     const deleteMutation = useMutation({
//         mutationFn: async () => {
//             const res = await fetch(`/api/documents/${schoolId}/admitcards/${admitCardId}`, {
//                 method: 'DELETE',
//             });
//             if (!res.ok) {
//                 const error = await res.json();
//                 throw new Error(error.error || 'Failed to delete');
//             }
//             return res.json();
//         },
//         onSuccess: () => {
//             toast.success('Admit card deleted successfully');
//             queryClient.invalidateQueries({ queryKey: ['admitcards'] });
//             router.push('/dashboard/documents/admit-cards');
//         },
//         onError: (error) => {
//             toast.error(error.message || 'Failed to delete admit card');
//         },
//     });

//     // Email admit card
//     const handleEmailAdmitCard = async () => {
//         setEmailSending(true);
//         try {
//             const res = await fetch(`/api/documents/${schoolId}/admitcards/${admitCardId}/email`, {
//                 method: 'POST',
//             });
//             if (!res.ok) throw new Error('Failed to send email');
//             toast.success('Admit card sent successfully');
//         } catch (error) {
//             toast.error(error.message || 'Failed to send email');
//         } finally {
//             setEmailSending(false);
//         }
//     };

//     // Print admit card
//     const handlePrint = () => {
//         if (admitCard?.fileUrl) {
//             window.open(admitCard.fileUrl, '_blank');
//         }
//     };

//     if (!schoolId || !admitCardId) {
//         return (
//             <div className="flex items-center justify-center min-h-screen">
//                 <div className="text-center">
//                     <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
//                     <h2 className="text-xl font-semibold mb-2">Invalid Admit Card</h2>
//                     <p className="text-muted-foreground mb-4">The admit card ID is invalid or missing.</p>
//                     <Button onClick={() => router.push('/dashboard/documents/admit-cards')}>
//                         Go Back
//                     </Button>
//                 </div>
//             </div>
//         );
//     }

//     if (isLoading) {
//         return (
//             <div className="flex items-center justify-center min-h-screen">
//                 <Loader2 className="h-8 w-8 animate-spin" />
//             </div>
//         );
//     }

//     return (
//         <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
//             {/* Header */}
//             <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//                 <div className="space-y-1">
//                     <div className="flex items-center gap-2">
//                         <Button
//                             variant="ghost"
//                             size="sm"
//                             onClick={() => router.back()}
//                             className="mr-2"
//                         >
//                             <ArrowLeft className="h-4 w-4" />
//                         </Button>
//                         <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
//                             <FileText className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0 text-primary" />
//                             <span>Admit Card Preview</span>
//                         </h1>
//                     </div>
//                     <p className="text-xs sm:text-sm text-muted-foreground ml-10 sm:ml-12">
//                         View and manage admit card details
//                     </p>
//                 </div>
//                 <div className="flex flex-wrap gap-2">
//                     <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={handlePrint}
//                     >
//                         <Printer className="mr-2 h-4 w-4" />
//                         Print
//                     </Button>
//                     <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={handleEmailAdmitCard}
//                         disabled={emailSending}
//                     >
//                         {emailSending ? (
//                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                         ) : (
//                             <Mail className="mr-2 h-4 w-4" />
//                         )}
//                         Email
//                     </Button>
//                     <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={() => {
//                             const link = document.createElement('a');
//                             link.href = admitCard?.fileUrl;
//                             link.download = `admit-card-${admitCard?.seatNumber}.pdf`;
//                             link.click();
//                         }}
//                     >
//                         <Download className="mr-2 h-4 w-4" />
//                         Download
//                     </Button>
//                 </div>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
//                 {/* Admit Card Details */}
//                 <div className="lg:col-span-1 space-y-4">
//                     <Card>
//                         <CardHeader>
//                             <CardTitle className="text-base sm:text-lg">Admit Card Information</CardTitle>
//                             <CardDescription className="text-xs sm:text-sm">
//                                 Details and metadata
//                             </CardDescription>
//                         </CardHeader>
//                         <CardContent className="space-y-4">
//                             {/* Seat Number */}
//                             <div className="space-y-1">
//                                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
//                                     <Hash className="h-4 w-4" />
//                                     <span>Seat Number</span>
//                                 </div>
//                                 <p className="font-mono text-sm font-semibold">
//                                     {admitCard?.seatNumber}
//                                 </p>
//                             </div>

//                             {/* Student Name */}
//                             <div className="space-y-1">
//                                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
//                                     <User className="h-4 w-4" />
//                                     <span>Student Name</span>
//                                 </div>
//                                 <p className="font-medium text-sm">
//                                     {admitCard?.student?.name}
//                                 </p>
//                             </div>

//                             {/* Roll Number */}
//                             <div className="space-y-1">
//                                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
//                                     <Hash className="h-4 w-4" />
//                                     <span>Roll Number</span>
//                                 </div>
//                                 <p className="text-sm">
//                                     {admitCard?.student?.rollNumber}
//                                 </p>
//                             </div>

//                             {/* Exam */}
//                             <div className="space-y-1">
//                                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
//                                     <FileText className="h-4 w-4" />
//                                     <span>Exam</span>
//                                 </div>
//                                 <p className="text-sm">
//                                     {admitCard?.exam?.title || 'N/A'}
//                                 </p>
//                             </div>

//                             {/* Exam Center */}
//                             {admitCard?.center && (
//                                 <div className="space-y-1">
//                                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
//                                         <FileText className="h-4 w-4" />
//                                         <span>Exam Center</span>
//                                     </div>
//                                     <p className="text-sm">
//                                         {admitCard?.center}
//                                     </p>
//                                 </div>
//                             )}

//                             {/* Issue Date */}
//                             <div className="space-y-1">
//                                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
//                                     <Calendar className="h-4 w-4" />
//                                     <span>Issue Date</span>
//                                 </div>
//                                 <p className="text-sm">
//                                     {new Date(admitCard?.issueDate).toLocaleDateString('en-US', {
//                                         year: 'numeric',
//                                         month: 'long',
//                                         day: 'numeric',
//                                     })}
//                                 </p>
//                             </div>

//                             <Separator />

//                             {/* Actions */}
//                             <div className="space-y-2">
//                                 <Button
//                                     variant="destructive"
//                                     size="sm"
//                                     className="w-full"
//                                     onClick={() => setShowDeleteDialog(true)}
//                                 >
//                                     <Trash2 className="mr-2 h-4 w-4" />
//                                     Delete Admit Card
//                                 </Button>
//                             </div>
//                         </CardContent>
//                     </Card>
//                 </div>

//                 {/* Admit Card Preview */}
//                 <div className="lg:col-span-2">
//                     <Card>
//                         <CardHeader>
//                             <CardTitle className="text-base sm:text-lg">Admit Card Preview</CardTitle>
//                             <CardDescription className="text-xs sm:text-sm">
//                                 Full-size preview of the generated admit card
//                             </CardDescription>
//                         </CardHeader>
//                         <CardContent>
//                             {admitCard?.fileUrl ? (
//                                 <div className="space-y-4">
//                                     <iframe
//                                         src={admitCard.fileUrl}
//                                         className="w-full h-[600px] sm:h-[700px] lg:h-[800px] border rounded-lg"
//                                         title="Admit Card Preview"
//                                     />
//                                     <div className="flex flex-col sm:flex-row gap-2">
//                                         <Button
//                                             variant="outline"
//                                             onClick={() => window.open(admitCard.fileUrl, '_blank')}
//                                             className="flex-1"
//                                         >
//                                             Open in New Tab
//                                         </Button>
//                                         <Button
//                                             onClick={() => {
//                                                 const link = document.createElement('a');
//                                                 link.href = admitCard.fileUrl;
//                                                 link.download = `admit-card-${admitCard.seatNumber}.pdf`;
//                                                 link.click();
//                                             }}
//                                             className="flex-1"
//                                         >
//                                             <Download className="mr-2 h-4 w-4" />
//                                             Download PDF
//                                         </Button>
//                                     </div>
//                                 </div>
//                             ) : (
//                                 <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
//                                     <FileText className="h-16 w-16 text-muted-foreground mb-4" />
//                                     <h3 className="text-lg font-semibold mb-2">No Preview Available</h3>
//                                     <p className="text-sm text-muted-foreground max-w-sm">
//                                         The admit card file could not be loaded. Please try regenerating the admit card.
//                                     </p>
//                                 </div>
//                             )}
//                         </CardContent>
//                     </Card>
//                 </div>
//             </div>

//             {/* Delete Confirmation Dialog */}
//             <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
//                 <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
//                     <AlertDialogHeader>
//                         <AlertDialogTitle className="text-base sm:text-lg">
//                             Delete Admit Card?
//                         </AlertDialogTitle>
//                         <AlertDialogDescription className="text-xs sm:text-sm">
//                             This action cannot be undone. This will permanently delete the admit card
//                             for seat number <strong>{admitCard?.seatNumber}</strong> and remove it from all records.
//                         </AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
//                         <AlertDialogCancel className="m-0 w-full sm:w-auto">
//                             Cancel
//                         </AlertDialogCancel>
//                         <AlertDialogAction
//                             onClick={() => deleteMutation.mutate()}
//                             className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
//                         >
//                             {deleteMutation.isPending ? (
//                                 <Loader2 className="h-4 w-4 animate-spin" />
//                             ) : (
//                                 'Delete'
//                             )}
//                         </AlertDialogAction>
//                     </AlertDialogFooter>
//                 </AlertDialogContent>
//             </AlertDialog>
//         </div>
//     );
// }

'use client';

import { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    Loader2,
    FileText,
    ArrowLeft,
    Edit,
    Trash2,
    AlertCircle,
    Download
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';

const ELEMENT_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    TABLE: 'table',
};

export default function TemplatePreviewPage() {
    const router = useRouter();
    const params = useParams();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const templateId = params?.id;
    const canvasRef = useRef(null);

    // Fetch template
    const { data: template, isLoading } = useQuery({
        queryKey: ['admitcard-template', templateId, schoolId],
        queryFn: async () => {
            if (!schoolId || !templateId) throw new Error('Invalid parameters');
            const res = await fetch(`/api/documents/${schoolId}/admitcard-templates/${templateId}`);
            if (!res.ok) throw new Error('Failed to fetch template');
            return res.json();
        },
        enabled: !!schoolId && !!templateId,
    });

    const renderElement = (element) => {
        const baseStyle = {
            position: 'absolute',
            left: `${element.x}px`,
            top: `${element.y}px`,
            border: '1px solid rgba(200, 200, 200, 0.5)',
            zIndex: 1
        };

        // Sample data for preview
        const sampleData = {
            rollNumber: '2024001',
            admissionNo: 'ADM2024001',
            studentName: 'John Doe',
            class: 'Class 10-A',
            dob: '2010-01-15',
            gender: 'Male',
            fatherName: 'Robert Doe',
            motherName: 'Jane Doe',
            address: '123 Main Street, City',
            schoolName: template?.layoutConfig?.headerText || 'School Name',
            examCenter: 'Main Examination Hall',
            year: new Date().getFullYear(),
            examDate1: '2024-03-15 | 10:00 AM - 1:00 PM',
            paperCode1: 'ENG101',
            subject1: 'English Language',
            opted1: 'Yes',
            examDate2: '2024-03-16 | 10:00 AM - 1:00 PM',
            paperCode2: 'MATH101',
            subject2: 'Mathematics',
            opted2: 'Yes',
            examDate3: '2024-03-17 | 10:00 AM - 1:00 PM',
            paperCode3: 'SCI101',
            subject3: 'Science',
            opted3: 'Yes',
            examDate4: '2024-03-18 | 10:00 AM - 1:00 PM',
            paperCode4: 'SST101',
            subject4: 'Social Studies',
            opted4: 'Yes',
        };

        const replaceVariables = (text) => {
            if (!text) return text;
            let result = text;
            const matches = text.match(/\{\{(\w+)\}\}/g);
            if (matches) {
                matches.forEach(match => {
                    const key = match.replace(/[{}]/g, '');
                    const value = sampleData[key] || match;
                    result = result.replace(match, value);
                });
            }
            return result;
        };

        switch (element.type) {
            case ELEMENT_TYPES.TEXT:
                return (
                    <div
                        key={element.id}
                        style={{
                            ...baseStyle,
                            width: `${element.width}px`,
                            minHeight: `${element.height}px`,
                            fontSize: `${element.fontSize}px`,
                            fontWeight: element.fontWeight,
                            textAlign: element.textAlign,
                            color: element.color,
                            padding: '4px',
                            wordWrap: 'break-word',
                            ...(element.textDecoration && { textDecoration: element.textDecoration })
                        }}
                    >
                        {replaceVariables(element.content)}
                    </div>
                );

            case ELEMENT_TYPES.IMAGE:
                return (
                    <div
                        key={element.id}
                        style={{
                            ...baseStyle,
                            width: `${element.width}px`,
                            height: `${element.height}px`,
                            backgroundColor: element.url && !element.url.startsWith('{{') ? 'transparent' : '#f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            ...(element.border && {
                                border: `${element.borderWidth || 2}px solid ${element.borderColor || '#000'}`
                            })
                        }}
                    >
                        {element.url && !element.url.startsWith('{{') ? (
                            <img
                                src={element.url}
                                alt="Template element"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div className="text-center">
                                <FileText className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                <span className="text-xs text-gray-500">
                                    {element.url?.startsWith('{{') ? replaceVariables(element.url) : 'Image Placeholder'}
                                </span>
                            </div>
                        )}
                    </div>
                );

            case ELEMENT_TYPES.TABLE:
                return (
                    <div
                        key={element.id}
                        style={{
                            ...baseStyle,
                            width: `${element.width}px`
                        }}
                    >
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '10px',
                            backgroundColor: '#fff'
                        }}>
                            {element.columns && (
                                <thead>
                                    <tr>
                                        {element.columns.map((col, idx) => (
                                            <th
                                                key={idx}
                                                style={{
                                                    border: `${element.borderWidth || 1}px solid ${element.borderColor || '#000'}`,
                                                    padding: `${element.cellPadding || 6}px`,
                                                    fontWeight: 'bold',
                                                    backgroundColor: element.headerBg || '#f5f5f5',
                                                    width: col.width || 'auto',
                                                    textAlign: 'left',
                                                    fontSize: '11px',
                                                    color: 'black',
                                                }}
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                            )}
                            <tbody>
                                {element.rows?.map((row, rowIdx) => (
                                    <tr key={rowIdx}>
                                        {Array.isArray(row) ? (
                                            row.map((cell, cellIdx) => {
                                                const isObject = typeof cell === 'object';
                                                const content = isObject ? (cell.label || cell.field) : cell;
                                                const displayContent = replaceVariables(content);
                                                const colspan = isObject && cell.colspan ? cell.colspan : 1;
                                                const isBold = isObject && cell.label;

                                                return (
                                                    <td
                                                        key={cellIdx}
                                                        colSpan={colspan}
                                                        style={{
                                                            border: `${element.borderWidth || 1}px solid ${element.borderColor || '#000'}`,
                                                            padding: `${element.cellPadding || 6}px`,
                                                            fontWeight: isBold ? 'bold' : 'normal',
                                                            fontSize: '10px',
                                                            color: 'black',
                                                        }}
                                                    >
                                                        {displayContent}
                                                    </td>
                                                );
                                            })
                                        ) : null}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            default:
                return null;
        }
    };

    if (!schoolId || !templateId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Invalid Template</h2>
                    <p className="text-muted-foreground mb-4">The template ID is invalid or missing.</p>
                    <Button onClick={() => router.push('/dashboard/documents/templates/admit-cards')}>
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

    const elements = template?.layoutConfig?.elements || [];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/dashboard/documents/templates/admit-cards')}
                            className="mr-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0 text-primary" />
                            <span>{template?.name}</span>
                        </h1>
                        {template?.isDefault && (
                            <Badge variant="secondary" className="ml-2">Default</Badge>
                        )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground ml-10 sm:ml-12">
                        {template?.description || 'Template preview with sample data'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/documents/templates/admit-cards/edit/${templateId}`)}
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Template Details */}
                <div className="lg:col-span-1 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg">Template Information</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Details and metadata
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Template Name</p>
                                <p className="font-medium text-sm">{template?.name}</p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Exam Type</p>
                                <Badge variant="outline" className="capitalize">
                                    {template?.examType || 'General'}
                                </Badge>
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Layout Type</p>
                                <p className="text-sm capitalize">{template?.layoutType || 'Standard'}</p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Created By</p>
                                <p className="text-sm">{template?.createdBy?.name || 'Unknown'}</p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Created At</p>
                                <p className="text-sm">
                                    {new Date(template?.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Elements</p>
                                <p className="text-sm font-mono">{elements.length} elements</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Template Preview */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg">Live Preview</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Preview with sample student data
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div
                                ref={canvasRef}
                                className="relative border-2 rounded-lg overflow-auto"
                                style={{
                                    width: '100%',
                                    height: '700px',
                                    backgroundColor: template?.layoutConfig?.backgroundColor || '#FFFFFF',
                                }}
                            >
                                {elements.map(renderElement)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
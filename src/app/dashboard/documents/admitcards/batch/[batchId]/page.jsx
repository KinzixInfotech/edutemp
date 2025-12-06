'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Download, FileText, Calendar, Users, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function AdmitCardBatchPage(props) {
    const params = use(props.params);
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const { batchId } = params;

    // Fetch batch details
    const { data: batchCards, isLoading } = useQuery({
        queryKey: ['admit-card-batch', batchId, schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const res = await fetch(`/api/documents/${schoolId}/admitcards/history?batchId=${batchId}`);
            if (!res.ok) throw new Error('Failed to fetch batch details');
            return res.json();
        },
        enabled: !!schoolId && !!batchId,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!batchCards || batchCards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <h2 className="text-xl font-semibold">Batch Not Found</h2>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    // Extract common info from first card
    const firstCard = batchCards[0];
    const exam = firstCard.exam;
    const issueDate = firstCard.issueDate;
    const zipUrl = firstCard.layoutConfig?.zipUrl;
    const studentCount = batchCards.length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()} className="h-8 w-8 sm:h-9 sm:w-9">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0 text-primary" />
                            Batch Details
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            {exam?.title} • {format(new Date(issueDate), 'MMM dd, yyyy h:mm a')} • {studentCount} Students
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
                    {zipUrl ? (
                        <Button onClick={() => window.open(zipUrl, '_blank')} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                            <Download className="mr-2 h-4 w-4" />
                            Download Batch ZIP
                        </Button>
                    ) : (
                        <Button disabled variant="secondary" size="sm">
                            ZIP Not Available
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Generated Students</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Roll No</TableHead>
                                    <TableHead>Seat No</TableHead>
                                    <TableHead>Center</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {batchCards.map((card) => (
                                    <TableRow key={card.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 border">
                                                    <AvatarImage src={card.student?.user?.profilePicture} alt={card.student?.name} />
                                                    <AvatarFallback>{card.student?.name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{card.student?.name}</span>
                                                    <span className="text-xs text-muted-foreground">{card.student?.class?.className} - {card.student?.section?.name}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{card.student?.rollNumber}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono">
                                                {card.seatNumber}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{card.center || 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            {/* Note: In bulk generation, individual fileUrl might not be saved if we only uploaded ZIP. 
                                                However, the API could be enhanced to store individual URLs if we generated them separately.
                                                For now, we can only link to the ZIP or try to open individual if available.
                                            */}
                                            {card.fileUrl ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => window.open(card.fileUrl, '_blank')}
                                                >
                                                    <Download className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            ) : (
                                                // If no individual file, we can navigate to detail view which shows preview via iframes/PDF logic if possible?
                                                // Or just disable. Current Bulk logic only stores layoutConfig + ZIP URL usually.
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.push(`/dashboard/documents/admitcards/${card.id}`)}
                                                    title="View Details"
                                                >
                                                    <FileText className="h-4 w-4 text-primary" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

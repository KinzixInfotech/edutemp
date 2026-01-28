'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Lock, Unlock, Loader2, ChevronLeft, Eye, AlertCircle, School } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from 'next/link';

export default function HPCTermsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [lockDialog, setLockDialog] = useState({ open: false, term: null, action: '' });
    const [previewDialog, setPreviewDialog] = useState({ open: false, term: null });

    // ====== FETCH ACADEMIC YEAR ======
    const { data: academicYearsData } = useQuery({
        queryKey: ['academic-years', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!schoolId,
    });
    const academicYears = Array.isArray(academicYearsData) ? academicYearsData : (academicYearsData?.academicYears || []);
    const activeYear = academicYears.find(y => y.isActive);

    // ====== FETCH TERM STATUS ======
    const { data: termsData, isLoading: termsLoading } = useQuery({
        queryKey: ['hpc-terms', schoolId, activeYear?.id],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/terms?academicYearId=${activeYear?.id}`);
            if (!res.ok) {
                return {
                    terms: [
                        { number: 1, name: 'Term 1', locked: false, progress: 0 },
                        { number: 2, name: 'Term 2', locked: false, progress: 0 },
                    ]
                };
            }
            return res.json();
        },
        enabled: !!schoolId && !!activeYear?.id,
    });

    const terms = termsData?.terms || [
        { number: 1, name: 'Term 1', locked: false, progress: 0 },
        { number: 2, name: 'Term 2', locked: false, progress: 0 },
    ];

    // ====== TERM LOCK MUTATION ======
    const toggleTermLockMutation = useMutation({
        mutationFn: async ({ termNumber, locked }) => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/terms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academicYearId: activeYear?.id,
                    termNumber,
                    locked,
                }),
            });
            if (!res.ok) throw new Error('Failed to update term lock status');
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['hpc-terms'] });
            toast.success(`Term ${variables.termNumber} ${variables.locked ? 'locked' : 'unlocked'}`);
            setLockDialog({ open: false, term: null, action: '' });
        },
        onError: (err) => toast.error(err.message),
    });

    const isLoading = termsLoading;

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/dashboard/hpc"><Button variant="ghost" size="icon"><ChevronLeft className="w-5 h-5" /></Button></Link>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <Calendar className="w-7 h-7 text-orange-600" />Term Control
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage HPC term locks</p>
                </div>
            </div>

            <Alert><AlertCircle className="w-4 h-4" /><AlertDescription>Locking a term prevents teachers from modifying grades.</AlertDescription></Alert>

            <Card>
                <CardHeader className="border-b"><CardTitle>Term Status</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Term</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {terms.map((term) => (
                                <TableRow key={term.number}>
                                    <TableCell className="font-medium">{term.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={term.locked ? 'default' : 'outline'}>
                                            {term.locked ? <><Lock className="w-3 h-3 mr-1" />Locked</> : <><Unlock className="w-3 h-3 mr-1" />Open</>}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Progress value={term.progress} className="h-2 w-24" />
                                            <span className="text-sm">{term.progress}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setPreviewDialog({ open: true, term })}>
                                                <Eye className="w-4 h-4 mr-1" />
                                                Preview
                                            </Button>
                                            <Button
                                                variant={term.locked ? 'destructive' : 'default'}
                                                size="sm"
                                                onClick={() => setLockDialog({ open: true, term, action: term.locked ? 'unlock' : 'lock' })}
                                            >
                                                {term.locked ? <><Unlock className="w-4 h-4 mr-1" />Unlock</> : <><Lock className="w-4 h-4 mr-1" />Lock</>}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Lock Term Confirmation Dialog */}
            <AlertDialog open={lockDialog.open} onOpenChange={(open) => setLockDialog({ ...lockDialog, open })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {lockDialog.action === 'lock' ? 'Lock' : 'Unlock'} {lockDialog.term?.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {lockDialog.action === 'lock'
                                ? 'Locking this term will prevent all teachers from modifying grades, SEL assessments, and activity records. Only admins can unlock terms.'
                                : 'Unlocking this term will allow teachers to modify grades, SEL assessments, and activity records again.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => lockDialog.term && toggleTermLockMutation.mutate({ termNumber: lockDialog.term.number, locked: lockDialog.action === 'lock' })}
                            className={lockDialog.action === 'lock' ? '' : 'bg-red-600 hover:bg-red-700'}
                        >
                            {toggleTermLockMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {lockDialog.action === 'lock' ? 'Lock Term' : 'Unlock Term'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Preview Dialog */}
            <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ ...previewDialog, open })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Preview {previewDialog.term?.name} Report</DialogTitle>
                        <DialogDescription>
                            This feature will allow you to preview the generated report card for a selected student.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-dashed">
                        <School className="w-12 h-12 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Student Report Preview</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">Select a student (Coming Soon)</p>
                        <Button variant="outline" disabled>Select Student</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

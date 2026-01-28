'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Lock, Unlock, Loader2, ChevronLeft, Eye, AlertCircle, School, User, BookOpen, Heart, Activity, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');

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

    // ====== FETCH CLASSES ======
    const { data: classesData } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!schoolId,
    });
    const classes = classesData?.classes || classesData || [];

    // ====== FETCH STUDENTS FOR SELECTED CLASS ======
    const { data: studentsData, isLoading: studentsLoading } = useQuery({
        queryKey: ['students-for-class', schoolId, selectedClass],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/students?classId=${selectedClass}`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!schoolId && !!selectedClass,
    });
    const students = studentsData?.students || studentsData || [];

    // ====== FETCH HPC REPORT FOR PREVIEW ======
    const { data: hpcData, isLoading: hpcLoading, refetch: refetchHpc } = useQuery({
        queryKey: ['hpc-preview', schoolId, selectedStudent, previewDialog.term?.number],
        queryFn: async () => {
            const res = await fetch(
                `/api/schools/${schoolId}/hpc/report?studentId=${selectedStudent}&termNumber=${previewDialog.term?.number}`
            );
            if (!res.ok) throw new Error('Failed to load HPC');
            return res.json();
        },
        enabled: !!schoolId && !!selectedStudent && !!previewDialog.term?.number && previewDialog.open,
    });

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

    // Reset student selection when class changes
    useEffect(() => {
        setSelectedStudent('');
    }, [selectedClass]);

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

    // Helper function to get grade display
    const getGradeDisplay = (grade) => {
        const gradeColors = {
            'A': 'bg-green-100 text-green-800 border-green-200',
            'B': 'bg-blue-100 text-blue-800 border-blue-200',
            'C': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'D': 'bg-orange-100 text-orange-800 border-orange-200',
            'E': 'bg-red-100 text-red-800 border-red-200',
        };
        return gradeColors[grade] || 'bg-gray-100 text-gray-800';
    };

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
                                            <Button variant="outline" size="sm" onClick={() => {
                                                setSelectedClass('');
                                                setSelectedStudent('');
                                                setPreviewDialog({ open: true, term });
                                            }}>
                                                <Eye className="w-4 h-4 mr-1" />
                                                Preview
                                            </Button>
                                            <Button
                                                variant={term.locked ? 'destructive' : 'default'}
                                                size="sm"
                                                onClick={() => setLockDialog({ open: true, term, action: term.locked ? 'unlock' : 'lock' })}
                                            >
                                                {term.locked ? <Unlock className="w-4 h-4 mr-1" /> : <Lock className="w-4 h-4 mr-1" />}
                                                {term.locked ? 'Unlock' : 'Lock'}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Lock Confirmation Dialog */}
            <AlertDialog open={lockDialog.open} onOpenChange={(open) => setLockDialog({ ...lockDialog, open })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {lockDialog.action === 'lock' ? 'Lock' : 'Unlock'} {lockDialog.term?.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {lockDialog.action === 'lock'
                                ? 'This will prevent teachers from making any changes to HPC grades for this term.'
                                : 'This will allow teachers to modify HPC grades for this term again.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => toggleTermLockMutation.mutate({
                                termNumber: lockDialog.term?.number,
                                locked: lockDialog.action === 'lock',
                            })}
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
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="w-5 h-5" />
                            Preview {previewDialog.term?.name} HPC Report
                        </DialogTitle>
                        <DialogDescription>
                            Select a class and student to preview their Holistic Progress Card
                        </DialogDescription>
                    </DialogHeader>

                    {/* Student Selector */}
                    <div className="grid grid-cols-2 gap-4 py-4 border-b">
                        <div className="space-y-2">
                            <Label>Select Class</Label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Select Student</Label>
                            <Select
                                value={selectedStudent}
                                onValueChange={setSelectedStudent}
                                disabled={!selectedClass || studentsLoading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={studentsLoading ? "Loading..." : "Choose a student"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {students.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.user?.name || s.name} (Roll: {s.rollNumber || 'N/A'})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* HPC Preview Content */}
                    {!selectedStudent ? (
                        <div className="py-12 flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-dashed">
                            <User className="w-12 h-12 text-muted-foreground mb-2" />
                            <p className="text-sm font-medium">Select a student to preview HPC</p>
                            <p className="text-xs text-muted-foreground mt-1">Choose a class first, then select a student</p>
                        </div>
                    ) : hpcLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                            <p className="text-sm text-muted-foreground">Loading HPC data...</p>
                        </div>
                    ) : hpcData ? (
                        <div className="space-y-4 pt-4">
                            {/* Student Info Header */}
                            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white">
                                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                                    {hpcData.student?.name?.charAt(0) || 'S'}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{hpcData.student?.name || 'Student'}</h3>
                                    <p className="text-sm text-blue-100">
                                        Class: {hpcData.student?.class || 'N/A'} | Roll: {hpcData.student?.rollNumber || 'N/A'}
                                    </p>
                                </div>
                                <div className="ml-auto text-right">
                                    <div className="text-3xl font-bold">{hpcData.overallScore || 0}</div>
                                    <div className="text-sm text-blue-100">Overall Score</div>
                                </div>
                            </div>

                            {/* HPC Sections */}
                            <Tabs defaultValue="academics" className="w-full">
                                <TabsList className="grid grid-cols-3 w-full">
                                    <TabsTrigger value="academics" className="flex items-center gap-1">
                                        <BookOpen className="w-4 h-4" />Academics
                                    </TabsTrigger>
                                    <TabsTrigger value="sel" className="flex items-center gap-1">
                                        <Heart className="w-4 h-4" />Behavior & SEL
                                    </TabsTrigger>
                                    <TabsTrigger value="activities" className="flex items-center gap-1">
                                        <Activity className="w-4 h-4" />Activities
                                    </TabsTrigger>
                                </TabsList>

                                {/* Academics Tab */}
                                <TabsContent value="academics" className="mt-4">
                                    {hpcData.competencies?.length > 0 ? (
                                        <div className="space-y-3">
                                            {hpcData.competencies.map((comp, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                    <div>
                                                        <p className="font-medium">{comp.name}</p>
                                                        <p className="text-xs text-muted-foreground">{comp.subject}</p>
                                                    </div>
                                                    <Badge className={getGradeDisplay(comp.grade)}>{comp.grade || 'N/A'}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center text-muted-foreground">
                                            <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            <p>No academic competencies recorded for this term</p>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* SEL Tab */}
                                <TabsContent value="sel" className="mt-4">
                                    {hpcData.selAssessments?.length > 0 ? (
                                        <div className="space-y-3">
                                            {hpcData.selAssessments.map((sel, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                    <div>
                                                        <p className="font-medium">{sel.parameter}</p>
                                                        <p className="text-xs text-muted-foreground">{sel.category}</p>
                                                    </div>
                                                    <Badge className={getGradeDisplay(sel.grade)}>{sel.grade || 'N/A'}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center text-muted-foreground">
                                            <Heart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            <p>No SEL assessments recorded for this term</p>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Activities Tab */}
                                <TabsContent value="activities" className="mt-4">
                                    {hpcData.activities?.length > 0 ? (
                                        <div className="space-y-3">
                                            {hpcData.activities.map((act, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                    <div>
                                                        <p className="font-medium">{act.name}</p>
                                                        <p className="text-xs text-muted-foreground">{act.category}</p>
                                                    </div>
                                                    <Badge variant="outline">{act.achievement || 'Participated'}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center text-muted-foreground">
                                            <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            <p>No activities recorded for this term</p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>

                            {/* Teacher Feedback */}
                            {hpcData.teacherFeedback && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <h4 className="font-medium mb-2 flex items-center gap-2">
                                        <User className="w-4 h-4" />Teacher's Remark
                                    </h4>
                                    <p className="text-sm text-muted-foreground italic">"{hpcData.teacherFeedback}"</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/20 rounded-lg">
                            <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
                            <p className="text-sm font-medium">Unable to load HPC data</p>
                            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchHpc()}>
                                Retry
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

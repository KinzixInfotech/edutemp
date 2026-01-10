'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    Loader2, ArrowLeft, Save, Send, Lock, AlertCircle, User, BookOpen, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function TeacherMarksContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');
    const classId = searchParams.get('classId');

    const [token, setToken] = useState('');
    const [teacherData, setTeacherData] = useState(null);
    const [localMarks, setLocalMarks] = useState([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [submitDialog, setSubmitDialog] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const totalPages = Math.ceil(localMarks.length / itemsPerPage);

    const paginatedMarks = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return localMarks.slice(start, start + itemsPerPage);
    }, [localMarks, currentPage]);

    // Load session
    useEffect(() => {
        const storedToken = localStorage.getItem('teacherPortalToken');
        const storedData = localStorage.getItem('teacherPortalData');

        if (!storedToken) {
            router.push('/teacher');
            return;
        }

        setToken(storedToken);
        if (storedData) setTeacherData(JSON.parse(storedData));
    }, [router]);

    // Fetch marks data
    const { data, isLoading, error } = useQuery({
        queryKey: ['teacher-marks', examId, subjectId, classId],
        queryFn: async () => {
            const res = await fetch(`/api/teacher/marks?examId=${examId}&subjectId=${subjectId}&classId=${classId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                if (res.status === 401) {
                    router.push('/teacher');
                    throw new Error('Session expired');
                }
                if (res.status === 403) {
                    throw new Error('Access denied');
                }
                throw new Error('Failed to fetch marks');
            }
            return res.json();
        },
        enabled: !!token && !!examId && !!subjectId && !!classId,
        onSuccess: (data) => {
            setLocalMarks(data.students || []);
        }
    });

    // Update local marks when data loads
    useEffect(() => {
        if (data?.students) {
            setLocalMarks(data.students);
        }
    }, [data]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/teacher/marks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    examId,
                    subjectId,
                    classId,
                    marks: localMarks
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Marks saved as draft');
            setHasChanges(false);
            queryClient.invalidateQueries(['teacher-marks', examId, subjectId, classId]);
        },
        onError: (err) => toast.error(err.message)
    });

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async () => {
            // First save
            await saveMutation.mutateAsync();

            // Then submit
            const res = await fetch('/api/teacher/marks', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    examId,
                    subjectId,
                    classId,
                    action: 'SUBMIT'
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to submit');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Marks submitted successfully!');
            setSubmitDialog(false);
            queryClient.invalidateQueries(['teacher-marks']);
            queryClient.invalidateQueries(['teacher-exams']);
            router.push('/teacher/dashboard');
        },
        onError: (err) => toast.error(err.message)
    });

    // Handle mark change
    const handleMarkChange = (studentId, field, value) => {
        setLocalMarks(prev => prev.map(m => {
            if (m.studentId === studentId) {
                // If marking absent, clear marks
                if (field === 'isAbsent' && value) {
                    return { ...m, [field]: value, marksObtained: '' };
                }
                return { ...m, [field]: value };
            }
            return m;
        }));
        setHasChanges(true);
    };

    // Summary stats
    const stats = useMemo(() => {
        const filled = localMarks.filter(m => m.marksObtained !== '' || m.isAbsent).length;
        const absent = localMarks.filter(m => m.isAbsent).length;
        const passed = localMarks.filter(m =>
            m.marksObtained !== '' &&
            parseFloat(m.marksObtained) >= (data?.passingMarks || 33)
        ).length;
        return { filled, absent, passed, total: localMarks.length };
    }, [localMarks, data?.passingMarks]);

    if (!examId || !subjectId || !classId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Missing exam, subject, or class parameters</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/teacher/dashboard">
                            <Button variant="ghost" size="sm" className="px-2 sm:px-4">
                                <ArrowLeft className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">Back</span>
                            </Button>
                        </Link>
                        <Image src="/by.png" alt="EduBreezy" width={32} height={32} />
                    </div>

                    <div className="flex items-center gap-2">
                        {hasChanges && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 h-8 px-2 flex items-center justify-center">
                                <span className="hidden sm:inline">Unsaved changes</span>
                                <span className="sm:hidden text-xs">Unsaved</span>
                            </Badge>
                        )}
                        {!data?.isLocked && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => saveMutation.mutate()}
                                    disabled={saveMutation.isPending || !hasChanges}
                                    className="px-2 sm:px-4"
                                >
                                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <Save className="w-4 h-4 sm:mr-2" />}
                                    <span className="hidden sm:inline">Save Draft</span>
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => setSubmitDialog(true)}
                                    disabled={submitMutation.isPending}
                                    className="bg-emerald-600 hover:bg-emerald-700 px-2 sm:px-4"
                                >
                                    <Send className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Submit</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Role Banner */}
                <Alert className="bg-emerald-50 border-emerald-200">
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-700">
                        You are entering marks as <strong>Evaluator</strong> for{' '}
                        <strong>{data?.subject?.subjectName}</strong> - <strong>{data?.class?.className}</strong>
                    </AlertDescription>
                </Alert>

                {/* Lock Warning */}
                {data?.isLocked && (
                    <Alert variant="destructive">
                        <Lock className="h-4 w-4" />
                        <AlertDescription>
                            Marks are <strong>locked</strong> by admin. You cannot edit. Contact administrator to unlock.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="shadow-none border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Marks Filled</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{stats.filled}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Absent</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Passed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Marks Table */}
                <Card className="shadow-none border">
                    <CardHeader>
                        <CardTitle>{data?.exam?.title}</CardTitle>
                        <CardDescription>
                            Max Marks: {data?.maxMarks} | Passing: {data?.passingMarks}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : error ? (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error.message}</AlertDescription>
                            </Alert>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-lg border overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50 border-b">
                                                    <TableHead className="w-16">#</TableHead>
                                                    <TableHead>Student</TableHead>
                                                    <TableHead>Roll No</TableHead>
                                                    <TableHead className="w-32">Marks</TableHead>
                                                    <TableHead className="w-24">Absent</TableHead>
                                                    <TableHead>Remarks</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paginatedMarks.map((student, idx) => (
                                                    <TableRow key={student.studentId} className={idx % 2 === 0 ? 'bg-slate-50/30' : ''}>
                                                        <TableCell className="font-mono text-muted-foreground">{((currentPage - 1) * itemsPerPage) + idx + 1}</TableCell>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                                                                    <User className="w-4 h-4 text-slate-500" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-900">{student.name}</p>
                                                                    <p className="text-xs text-muted-foreground">{student.admissionNo}</p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{student.rollNumber || '-'}</TableCell>
                                                        <TableCell>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max={data?.maxMarks || 100}
                                                                value={student.marksObtained}
                                                                onChange={(e) => handleMarkChange(student.studentId, 'marksObtained', e.target.value)}
                                                                placeholder="—"
                                                                disabled={data?.isLocked || student.isAbsent}
                                                                className={`w-24 h-9 shadow-none ${student.isAbsent ? 'bg-slate-50 text-muted-foreground' : ''} ${student.marksObtained !== '' && parseFloat(student.marksObtained) < (data?.passingMarks || 33)
                                                                    ? 'border-red-300 focus-visible:ring-red-300'
                                                                    : 'border-slate-200'
                                                                    }`}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center justify-center">
                                                                <Checkbox
                                                                    checked={student.isAbsent}
                                                                    onCheckedChange={(checked) => handleMarkChange(student.studentId, 'isAbsent', checked)}
                                                                    disabled={data?.isLocked}
                                                                    className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                value={student.remarks || ''}
                                                                onChange={(e) => handleMarkChange(student.studentId, 'remarks', e.target.value)}
                                                                placeholder="Optional"
                                                                disabled={data?.isLocked}
                                                                className="text-sm h-9 shadow-none border-slate-200"
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-end gap-2 text-sm">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="h-8 w-20 shadow-none"
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-muted-foreground px-2">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="h-8 w-20 shadow-none"
                                        >
                                            Next
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Submit Confirmation Dialog */}
            <Dialog open={submitDialog} onOpenChange={setSubmitDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Submit Marks?</DialogTitle>
                        <DialogDescription>
                            Once submitted, you <strong>cannot edit</strong> these marks without admin approval.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="bg-amber-50 p-4 rounded-lg text-sm text-amber-700">
                        <p className="font-medium mb-2">Summary:</p>
                        <ul className="space-y-1">
                            <li>✓ {stats.filled} / {stats.total} marks filled</li>
                            <li>✓ {stats.absent} students marked absent</li>
                            <li>✓ {stats.passed} students passed</li>
                        </ul>
                    </div>

                    {stats.filled < stats.total && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {stats.total - stats.filled} students have no marks entered!
                            </AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSubmitDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => submitMutation.mutate()}
                            disabled={submitMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {submitMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                            )}
                            Confirm Submit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    Loader2, LogOut, GraduationCap, FileText, Clock, CheckCircle2,
    Lock, AlertCircle, BookOpen, ChevronRight, User
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function TeacherDashboardContent() {
    const router = useRouter();
    const [teacherData, setTeacherData] = useState(null);
    const [token, setToken] = useState('');
    // Load session on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('teacherPortalToken');
        const storedData = localStorage.getItem('teacherPortalData');

        if (!storedToken) {
            router.push('/teacher');
            return;
        }

        setToken(storedToken);
        if (storedData) {
            setTeacherData(JSON.parse(storedData));
        }
    }, [router]);

    // Fetch assigned exams
    const { data: examsData, isLoading, error, refetch } = useQuery({
        queryKey: ['teacher-exams'],
        queryFn: async () => {
            const res = await fetch('/api/teacher/exams', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                if (res.status === 401) {
                    localStorage.removeItem('teacherPortalToken');
                    localStorage.removeItem('teacherPortalData');
                    router.push('/teacher');
                    throw new Error('Session expired');
                }
                throw new Error('Failed to fetch exams');
            }
            return res.json();
        },
        enabled: !!token,
        refetchInterval: 60000, // Refresh every minute
    });

    const handleLogout = async () => {
        try {
            await fetch('/api/teacher/session', {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Logout error:', err);
        }

        localStorage.removeItem('teacherPortalToken');
        localStorage.removeItem('teacherPortalData');
        toast.success('Logged out successfully');
        router.push('/teacher');
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'DRAFT':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Draft</Badge>;
            case 'SUBMITTED':
                return <Badge className="bg-blue-600 text-white">Submitted</Badge>;
            case 'LOCKED':
                return <Badge variant="destructive">Locked</Badge>;
            case 'PUBLISHED':
                return <Badge className="bg-green-600 text-white">Published</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    const getExamStatusBadge = (status) => {
        switch (status) {
            case 'DRAFT':
                return <Badge variant="outline">Draft</Badge>;
            case 'SCHEDULED':
                return <Badge className="bg-blue-100 text-blue-700">Scheduled</Badge>;
            case 'IN_PROGRESS':
                return <Badge className="bg-orange-100 text-orange-700">In Progress</Badge>;
            case 'COMPLETED':
                return <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>;
            case 'RESULTS_PENDING':
                return <Badge className="bg-purple-100 text-purple-700">Marks Entry</Badge>;
            case 'RESULTS_PUBLISHED':
                return <Badge className="bg-green-100 text-green-700">Results Out</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    if (!teacherData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/teacher" className="flex items-center gap-2">
                            {teacherData.school && teacherData.school.profilePicture ? (
                                <img src={teacherData.school.profilePicture} alt={teacherData.school.name} className="h-9 w-9 rounded-lg object-cover" />
                            ) : (
                                <Image src="/by.png" alt="EduBreezy" width={36} height={36} />
                            )}
                            <div>
                                <span className="font-bold text-lg text-gray-800 hidden sm:block">Teacher Portal</span>
                                {teacherData.school && <span className="text-xs text-muted-foreground sm:hidden">{teacherData.school.name}</span>}
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-red-500">
                            <LogOut className="w-4 h-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">

                {/* Hero Card - Pay Portal Style */}
                <Card className="mb-6 bg-gradient-to-br from-[#0168fb] via-[#0855d4] to-indigo-600 text-white border-0 shadow-xl overflow-hidden relative">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 rounded-full" />
                    <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-white/5 rounded-full" />

                    <CardContent className="p-5 sm:p-6 relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 text-center sm:text-left">
                                <div className="relative">
                                    {teacherData.profilePicture ? (
                                        <Image
                                            src={teacherData.profilePicture}
                                            alt={teacherData.name}
                                            width={80}
                                            height={80}
                                            className="w-24 h-24 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white/40 shadow-xl ring-4 ring-white/10"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/40 shadow-xl ring-4 ring-white/10">
                                            <span className="text-3xl sm:text-2xl font-bold text-white">
                                                {teacherData.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
                                </div>

                                <div className="pr-0 sm:pr-16">
                                    <h2 className="text-2xl sm:text-xl font-bold">{teacherData.name}</h2>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 text-blue-100 text-sm">
                                        <span className="bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                                            <GraduationCap className="w-3 h-3" />
                                            {teacherData.designation || 'Teacher'}
                                        </span>
                                        <span className="bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm">
                                            ID: {teacherData.employeeId || 'N/A'}
                                        </span>
                                    </div>
                                    {teacherData.school && (
                                        <p className="text-blue-100 text-sm mt-2 font-medium">
                                            {teacherData.school.name}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {teacherData.school && teacherData.school.profilePicture && (
                                <div className="hidden sm:block">
                                    <div className="bg-white rounded-xl p-1.5 shadow-lg">
                                        <img
                                            src={teacherData.school.profilePicture}
                                            alt={teacherData.school.name}
                                            className="h-12 w-12 object-contain rounded-lg"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="shadow-none border">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Assigned Exams</CardTitle>
                            <FileText className="w-4 h-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{examsData?.summary?.total || 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Pending Entry</CardTitle>
                            <Clock className="w-4 h-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{examsData?.summary?.pending || 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{examsData?.summary?.submitted || 0}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Assigned Exams */}
                <Card className="shadow-none border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            Your Assigned Exams
                        </CardTitle>
                        <CardDescription>
                            Enter marks for subjects assigned to you
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="border rounded-lg p-4">
                                        <Skeleton className="h-5 w-48 mb-2" />
                                        <Skeleton className="h-4 w-32 mb-4" />
                                        <div className="flex gap-2">
                                            <Skeleton className="h-8 w-28" />
                                            <Skeleton className="h-8 w-28" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 text-red-500">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                <p>Failed to load exams. Please try again.</p>
                                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                                    Retry
                                </Button>
                            </div>
                        ) : examsData?.exams?.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-lg font-medium">No Exams Assigned</p>
                                <p className="text-sm">You will see exams here when you are assigned as an evaluator.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {examsData?.exams?.map((exam) => (
                                    <div key={exam.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="font-semibold text-lg">{exam.title}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                    {getExamStatusBadge(exam.status)}
                                                    <span>•</span>
                                                    <span>{exam.academicYear?.name}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Assigned Subjects */}
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-muted-foreground">Your Assignments:</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                {exam.assignments?.map((assignment) => (
                                                    <Link
                                                        key={assignment.id}
                                                        href={`/teacher/marks?examId=${exam.id}&subjectId=${assignment.subject.id}&classId=${assignment.class.id}`}
                                                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${assignment.isLocked
                                                            ? 'bg-gray-50 opacity-70 cursor-not-allowed'
                                                            : 'bg-white hover:bg-emerald-50 hover:border-emerald-200'
                                                            }`}
                                                        onClick={(e) => {
                                                            if (assignment.isLocked) {
                                                                e.preventDefault();
                                                                toast.info('Marks are locked. Contact admin to unlock.');
                                                            }
                                                        }}
                                                    >
                                                        <div>
                                                            <p className="font-medium text-sm">{assignment.subject.subjectName}</p>
                                                            <p className="text-xs text-muted-foreground">{assignment.class.className}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {getStatusBadge(assignment.marksStatus)}
                                                            {assignment.isLocked ? (
                                                                <Lock className="w-4 h-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Footer */}
            <footer className="py-4 text-center text-sm text-muted-foreground border-t bg-white mt-auto">
                <p>© {new Date().getFullYear()} EduBreezy Teacher Portal</p>
            </footer>
        </div>
    );
}

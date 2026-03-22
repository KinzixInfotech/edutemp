'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Users, Calendar, CheckCircle, XCircle, Clock, AlertCircle,
    Search, Save, Undo, Download, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useAcademicYear } from '@/context/AcademicYearContext';

export default function ClassAttendanceMarking() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const { selectedYear } = useAcademicYear();
    const academicYearId = selectedYear?.id;
    const markerId = fullUser?.id;
    const queryClient = useQueryClient();

    const [classId, setClassId] = useState('');
    const [sectionId, setSectionId] = useState('all');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [attendanceData, setAttendanceData] = useState({});
    const [remarksData, setRemarksData] = useState({});

    // Fetch classes
    const { data: classes } = useQuery({
        queryKey: ['classes', schoolId, academicYearId],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: '-1' });
            if (academicYearId) params.append('academicYearId', academicYearId);
            const res = await fetch(`/api/schools/${schoolId}/classes?${params}`);
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            return Array.isArray(data) ? data : (data.data || []);
        },
        enabled: !!schoolId
    });

    // Fetch sections
    const { data: sections } = useQuery({
        queryKey: ['sections', classId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes/${classId}/sections`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!classId
    });

    // Fetch students
    const { data: studentsData, isLoading, refetch } = useQuery({
        queryKey: ['class-students', schoolId, classId, sectionId, date],
        queryFn: async () => {
            const params = new URLSearchParams({
                classId,
                date
            });

            if (sectionId && sectionId !== 'all') {
                params.append('sectionId', sectionId);
            }

            const res = await fetch(`/api/schools/${schoolId}/attendance/bulk?${params}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!classId && !!schoolId,
    });

    // Update attendance state when data changes
    useEffect(() => {
        if (studentsData?.students) {
            const existing = {};
            const remarks = {};

            studentsData.students.forEach(student => {
                if (student.attendance) {
                    existing[student.userId] = student.attendance.status;
                    if (student.attendance.remarks) {
                        remarks[student.userId] = student.attendance.remarks;
                    }
                }
            });

            setAttendanceData(existing);
            setRemarksData(remarks);
        }
    }, [studentsData]);

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: async () => {
            const attendance = Object.entries(attendanceData).map(([userId, status]) => ({
                userId,
                status,
                remarks: remarksData[userId] || null,
                forceUpdate: true // Force update if already marked
            }));

            const res = await fetch(`/api/schools/${schoolId}/attendance/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: parseInt(classId),
                    sectionId: sectionId && sectionId !== 'all' ? parseInt(sectionId) : null,
                    date,
                    attendance,
                    markedBy: markerId
                })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to submit');
            }

            return res.json();
        },
        onSuccess: (data) => {
            toast.success(`✅ Attendance marked successfully!`, {
                description: `${data.summary?.successful || 0} students marked, ${data.summary?.skipped || 0} skipped`
            });

            // Invalidate and refetch
            queryClient.invalidateQueries(['class-students', schoolId, classId, sectionId, date]);
            refetch();
        },
        onError: (error) => {
            toast.error('Failed to mark attendance', {
                description: error.message
            });
        }
    });

    const students = studentsData?.students || [];
    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.admissionNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNumber?.includes(searchQuery)
    );

    // Derived stats for summary cards
    const statsSummary = {
        total: filteredStudents.length,
        present: filteredStudents.filter(s => attendanceData[s.userId] === 'PRESENT').length,
        absent: filteredStudents.filter(s => attendanceData[s.userId] === 'ABSENT').length,
        pending: filteredStudents.filter(s => !attendanceData[s.userId]).length
    };

    // Grouping logic for section grouping
    const groupedStudents = sectionId === 'all'
        ? filteredStudents.reduce((acc, s) => {
            const section = s.sectionName || 'No Section';
            if (!acc[section]) acc[section] = [];
            acc[section].push(s);
            return acc;
        }, {})
        : { [studentsData?.students?.find(s => s.sectionId?.toString() === sectionId)?.sectionName || 'Selected Section']: filteredStudents };

    const handleMarkSectionPresent = (sectionStudents) => {
        const newData = { ...attendanceData };
        sectionStudents.forEach(s => {
            newData[s.userId] = 'PRESENT';
        });
        setAttendanceData(newData);
        toast.success(`Marked all ${sectionStudents.length} students in section as Present`);
    };

    const handleStatusToggle = (userId) => {
        const statuses = ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE'];
        const current = attendanceData[userId] || '';

        if (!current) {
            // If no status, set to PRESENT
            setAttendanceData(prev => ({
                ...prev,
                [userId]: 'PRESENT'
            }));
        } else {
            // Cycle through statuses
            const currentIndex = statuses.indexOf(current);
            const nextStatus = statuses[(currentIndex + 1) % statuses.length];

            setAttendanceData(prev => ({
                ...prev,
                [userId]: nextStatus
            }));
        }
    };

    const handleMarkAll = (status) => {
        const newData = {};
        filteredStudents.forEach(student => {
            newData[student.userId] = status;
        });
        setAttendanceData(newData);
        toast.success(`Marked all ${filteredStudents.length} students as ${status}`);
    };

    const handleClear = () => {
        setAttendanceData({});
        setRemarksData({});
        toast.info('Cleared all selections');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PRESENT': return 'bg-green-500 hover:bg-green-600 text-white';
            case 'ABSENT': return 'bg-red-500 hover:bg-red-600 text-white';
            case 'LATE': return 'bg-yellow-500 hover:bg-yellow-600 text-white';
            case 'ON_LEAVE': return 'bg-blue-500 hover:bg-blue-600 text-white';
            default: return 'bg-gray-200 hover:bg-gray-300';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'PRESENT': return <CheckCircle className="w-5 h-5" />;
            case 'ABSENT': return <XCircle className="w-5 h-5" />;
            case 'LATE': return <Clock className="w-5 h-5" />;
            case 'ON_LEAVE': return <AlertCircle className="w-5 h-5" />;
            default: return null;
        }
    };

    const markedCount = Object.keys(attendanceData).length;
    const totalCount = filteredStudents.length;
    const isComplete = markedCount === totalCount && totalCount > 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <Users className="w-8 h-8 text-blue-600" />
                        Mark Class Attendance
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Select class and date to manage attendance for all students
                    </p>
                </div>
            </div>

            {/* Selection Card */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Class *</label>
                            <Select value={classId} onValueChange={(value) => {
                                setClassId(value);
                                setSectionId('all');
                                setAttendanceData({});
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes?.map((cls) => (
                                        <SelectItem key={cls.id} value={cls.id.toString()}>
                                            {cls.className}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Section</label>
                            <Select value={sectionId} onValueChange={(value) => {
                                setSectionId(value);
                                setAttendanceData({});
                            }} disabled={!classId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Sections" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sections</SelectItem>
                                    {sections?.map((sec) => (
                                        <SelectItem key={sec.id} value={sec.id.toString()}>
                                            {sec.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Date *</label>
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    setAttendanceData({});
                                }}
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div className="flex items-end">
                            <Button
                                onClick={() => refetch()}
                                className="w-full"
                                disabled={!classId}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Load Students
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary & Actions Bar */}
            {students.length > 0 && (
                <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="bg-blue-50/50 border-blue-100">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Total</p>
                                        <p className="text-2xl font-bold">{statsSummary.total}</p>
                                    </div>
                                    <Users className="w-8 h-8 text-blue-200" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-green-50/50 border-green-100">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Present</p>
                                        <p className="text-2xl font-bold text-green-600">{statsSummary.present}</p>
                                    </div>
                                    <CheckCircle className="w-8 h-8 text-green-200" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-red-50/50 border-red-100">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Absent</p>
                                        <p className="text-2xl font-bold text-red-600">{statsSummary.absent}</p>
                                    </div>
                                    <XCircle className="w-8 h-8 text-red-200" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-amber-50/50 border-amber-100">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Pending</p>
                                        <p className="text-2xl font-bold text-amber-600">{statsSummary.pending}</p>
                                    </div>
                                    <Clock className="w-8 h-8 text-amber-200" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by name, admission no, roll no..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleMarkAll('PRESENT')}
                                        size="sm"
                                        className="hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        All Present
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleMarkAll('ABSENT')}
                                        size="sm"
                                        className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        All Absent
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleClear}
                                        size="sm"
                                    >
                                        <Undo className="w-4 h-4 mr-2" />
                                        Clear
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between flex-wrap gap-4 border-t pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-2">
                                        {[...Array(Math.min(3, statsSummary.present))].map((_, i) => (
                                            <div key={i} className="w-6 h-6 rounded-full border-2 border-background bg-green-500" />
                                        ))}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Marked: <span className="font-bold text-foreground text-lg">{markedCount}/{totalCount}</span>
                                        {isComplete && <Badge variant="success" className="ml-2">✓ Complete</Badge>}
                                    </div>
                                </div>
                                <Button
                                    onClick={() => submitMutation.mutate()}
                                    disabled={markedCount === 0 || submitMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700 shadow-md ring-offset-2 focus:ring-2 ring-green-500 transition-all px-8"
                                    size="lg"
                                >
                                    {submitMutation.isPending ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            Submitting Data...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Submit Attendance
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Students Grid */}
            {isLoading ? (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    </CardContent>
                </Card>
            ) : students.length === 0 ? (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center py-12">
                            <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                {classId ? 'No students found in this class' : 'Select class and date to load students'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : filteredStudents.length === 0 ? (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-center py-12">
                            <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No students found matching your search</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedStudents).map(([section, sectionStudents]) => (
                        <div key={section} className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" />
                                    Section {section}
                                    <Badge variant="secondary" className="ml-2 px-2 py-0 h-5">
                                        {sectionStudents.length} Students
                                    </Badge>
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-primary hover:text-primary hover:bg-primary/5"
                                    onClick={() => handleMarkSectionPresent(sectionStudents)}
                                >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    All Present
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {sectionStudents.map((student) => {
                                    const status = attendanceData[student.userId] || '';
                                    const hasRemarks = remarksData[student.userId];
                                    const isAlreadyMarked = student.isMarked && !status;

                                    return (
                                        <Card
                                            key={student.userId}
                                            className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${status ? 'ring-2 ring-offset-2' : 'hover:border-primary/50'
                                                } ${status === 'PRESENT' ? 'ring-green-500 bg-green-50/10' :
                                                    status === 'ABSENT' ? 'ring-red-500 bg-red-50/10' :
                                                        status === 'LATE' ? 'ring-yellow-500 bg-yellow-50/10' :
                                                            status === 'ON_LEAVE' ? 'ring-blue-500 bg-blue-50/10' : ''
                                                }`}
                                            onClick={() => handleStatusToggle(student.userId)}
                                        >
                                            <CardContent className="p-4 text-center">
                                                {/* Profile Picture */}
                                                <div className="relative w-16 h-16 mx-auto mb-3">
                                                    <Avatar className="w-16 h-16 border-2 border-background shadow-md group-hover:scale-110 transition-transform duration-300">
                                                        <AvatarImage src={student.profilePicture} />
                                                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-600 text-white text-xl font-bold">
                                                            {student.name.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {status && (
                                                        <div className={`absolute -right-1 -bottom-1 p-1 rounded-full border-2 border-background ${getStatusColor(status)}`}>
                                                            {getStatusIcon(status)}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Name & ID */}
                                                <div className="space-y-1">
                                                    <h4 className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                                                        {student.name}
                                                    </h4>
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">#{student.rollNumber || '00'}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">{student.admissionNo}</span>
                                                    </div>
                                                </div>

                                                {/* Status Label */}
                                                {status ? (
                                                    <div className={`mt-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === 'PRESENT' ? 'text-green-700 bg-green-100' :
                                                        status === 'ABSENT' ? 'text-red-700 bg-red-100' :
                                                            status === 'LATE' ? 'text-yellow-700 bg-yellow-100' :
                                                                status === 'ON_LEAVE' ? 'text-blue-700 bg-blue-100' : ''
                                                        }`}>
                                                        {status.replace('_', ' ')}
                                                    </div>
                                                ) : isAlreadyMarked ? (
                                                    <Badge variant="outline" className="mt-3 text-[9px] font-normal border-green-200 text-green-600 bg-green-50/50">
                                                        ✓ Marked
                                                    </Badge>
                                                ) : (
                                                    <div className="mt-3 text-[10px] text-muted-foreground font-medium group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all">
                                                        Tap to Mark
                                                    </div>
                                                )}

                                                {hasRemarks && (
                                                    <div className="absolute top-2 right-2 text-primary">
                                                        <AlertCircle className="w-3 h-3" />
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Legend */}
            {students.length > 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap gap-4 justify-center">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-green-500"></div>
                                <span className="text-sm">Present</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-red-500"></div>
                                <span className="text-sm">Absent</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-yellow-500"></div>
                                <span className="text-sm">Late</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded bg-blue-500"></div>
                                <span className="text-sm">On Leave</span>
                            </div>
                        </div>
                        <p className="text-center text-sm text-muted-foreground mt-3">
                            💡 Click on student cards to cycle through status options
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
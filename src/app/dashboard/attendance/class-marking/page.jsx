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
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function ClassAttendanceMarking() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
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
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
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
                        Bulk attendance marking for class/section
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

            {/* Actions Bar */}
            {students.length > 0 && (
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
                                >
                                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                    All Present
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={() => handleMarkAll('ABSENT')}
                                    size="sm"
                                >
                                    <XCircle className="w-4 h-4 mr-2 text-red-600" />
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

                        <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
                            <div className="text-sm text-muted-foreground">
                                Marked: <span className="font-bold text-foreground text-lg">{markedCount}/{totalCount}</span>
                                {isComplete && <Badge variant="success" className="ml-2">✓ Complete</Badge>}
                            </div>
                            <Button
                                onClick={() => submitMutation.mutate()}
                                disabled={markedCount === 0 || submitMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                                size="lg"
                            >
                                {submitMutation.isPending ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Submit Attendance ({markedCount})
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredStudents.map((student) => {
                        const status = attendanceData[student.userId] || '';
                        const hasRemarks = remarksData[student.userId];
                        const isAlreadyMarked = student.isMarked && !status;

                        return (
                            <Card
                                key={student.userId}
                                className={`cursor-pointer transition-all hover:shadow-lg ${
                                    status ? 'ring-2 ring-offset-2' : ''
                                } ${
                                    status === 'PRESENT' ? 'ring-green-500' :
                                    status === 'ABSENT' ? 'ring-red-500' :
                                    status === 'LATE' ? 'ring-yellow-500' :
                                    status === 'ON_LEAVE' ? 'ring-blue-500' : ''
                                }`}
                                onClick={() => handleStatusToggle(student.userId)}
                            >
                                <CardContent className="pt-6 text-center">
                                    {/* Photo */}
                                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-md">
                                        {student.name.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Name */}
                                    <h4 className="font-semibold text-sm mb-1 line-clamp-2 min-h-[2.5rem]">
                                        {student.name}
                                    </h4>

                                    {/* Roll No */}
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Roll: {student.rollNumber || 'N/A'}
                                    </p>

                                    {/* Status Badge */}
                                    {status && (
                                        <div className={`mt-3 py-2 px-3 rounded-lg flex items-center justify-center gap-2 ${getStatusColor(status)}`}>
                                            {getStatusIcon(status)}
                                            <span className="text-xs font-medium">
                                                {status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    )}

                                    {/* Already Marked Indicator */}
                                    {isAlreadyMarked && (
                                        <Badge variant="outline" className="mt-2 text-xs">
                                            ✓ Already Marked
                                        </Badge>
                                    )}

                                    {/* Remarks Indicator */}
                                    {hasRemarks && (
                                        <Badge variant="secondary" className="mt-2 text-xs">
                                            📝 Note
                                        </Badge>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
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
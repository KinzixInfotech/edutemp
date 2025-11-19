'use client'
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    UserCheck, UserX, Clock, AlertCircle, CheckCircle, Info, Calendar, Users, Award
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function DelegationManagement() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const userId = fullUser?.id;
    const [selectedClass, setSelectedClass] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const queryClient = useQueryClient();

    // Fetch teachers on leave TODAY
    const { data: teachersOnLeave, isLoading: loadingLeave } = useQuery({
        queryKey: ['teachers-on-leave', schoolId],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0];
            const res = await fetch(`/api/schools/${schoolId}/attendance/delegations/teachers-on-leave?date=${today}`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        staleTime: 1000 * 60 * 2,
    });

    // Fetch active delegations
    const { data: activeDelegations } = useQuery({
        queryKey: ['active-delegations', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/delegations?status=ACTIVE&includeDetails=true`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        staleTime: 1000 * 60 * 2,
    });

    // Fetch available substitute teachers
    const { data: availableTeachers } = useQuery({
        queryKey: ['available-teachers', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/teachers?available=true`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        enabled: !!selectedClass,
    });

    const stats = {
        teachersOnLeave: teachersOnLeave?.count || 0,
        classesAffected: teachersOnLeave?.classesAffected || 0,
        activeDelegations: activeDelegations?.count || 0,
        pendingAssignments: teachersOnLeave?.pending || 0
    };

    if (loadingLeave) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Loading delegation data...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 mb-2">
                    <UserCheck className="w-8 h-8 text-primary" />
                    Attendance Delegation Management
                </h1>
                <p className="text-sm text-muted-foreground">
                    Assign substitute teachers for classes with absent teachers today
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Teachers on Leave</p>
                                <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                                    {stats.teachersOnLeave}
                                </p>
                            </div>
                            <UserX className="w-10 h-10 text-orange-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Classes Affected</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-500">
                                    {stats.classesAffected}
                                </p>
                            </div>
                            <Users className="w-10 h-10 text-red-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active Delegations</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                                    {stats.activeDelegations}
                                </p>
                            </div>
                            <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Assignments</p>
                                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
                                    {stats.pendingAssignments}
                                </p>
                            </div>
                            <Clock className="w-10 h-10 text-yellow-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Info Alert */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-medium text-sm">Important Notes:</p>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                <li>Substitute teachers can only mark attendance for TODAY</li>
                                <li>Delegations are automatically created based on approved leave duration</li>
                                <li>Once assigned, the substitute teacher will have full access to mark attendance</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Classes with Absent Teachers */}
            <Card>
                <CardHeader>
                    <CardTitle>Classes with Absent Teachers Today</CardTitle>
                    <CardDescription>
                        {teachersOnLeave?.classes?.length || 0} classes need substitute teacher assignment
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!teachersOnLeave?.classes || teachersOnLeave.classes.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                            <p className="text-lg font-semibold mb-2">All Clear!</p>
                            <p className="text-sm text-muted-foreground">
                                No teachers on leave today. All classes have their regular teachers.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {teachersOnLeave.classes.map((classInfo) => (
                                <ClassCard
                                    key={classInfo.classId}
                                    classInfo={classInfo}
                                    onAssign={(cls) => {
                                        setSelectedClass(cls);
                                        setShowAssignModal(true);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Active Delegations */}
            {activeDelegations?.delegations && activeDelegations.delegations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Active Delegations Today</CardTitle>
                        <CardDescription>Currently assigned substitute teachers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {activeDelegations.delegations.map((delegation) => (
                                <ActiveDelegationCard
                                    key={delegation.id}
                                    delegation={delegation}
                                    onUpdate={() => queryClient.invalidateQueries(['active-delegations'])}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Assignment Modal */}
            {showAssignModal && selectedClass && (
                <AssignmentModal
                    classInfo={selectedClass}
                    schoolId={schoolId}
                    userId={userId}
                    availableTeachers={availableTeachers?.teachers || []}
                    onClose={() => {
                        setShowAssignModal(false);
                        setSelectedClass(null);
                    }}
                    onSuccess={() => {
                        setShowAssignModal(false);
                        setSelectedClass(null);
                        queryClient.invalidateQueries(['teachers-on-leave']);
                        queryClient.invalidateQueries(['active-delegations']);
                    }}
                />
            )}
        </div>
    );
}

function ClassCard({ classInfo, onAssign }) {
    const hasDelegation = classInfo.hasDelegation;

    return (
        <Card className={hasDelegation ? 'border-green-500/50 bg-green-500/5' : 'border-orange-500/50 bg-orange-500/5'}>
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                        {/* Class Info */}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">
                                    {classInfo.className}
                                    {classInfo.sectionName && ` - ${classInfo.sectionName}`}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {classInfo.studentCount} students
                                </p>
                            </div>
                        </div>

                        {/* Teacher Info */}
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-card border">
                            <UserX className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Absent Teacher</p>
                                <p className="font-medium">{classInfo.teacherName}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Employee ID: {classInfo.employeeId}
                                </p>
                            </div>
                        </div>

                        {/* Leave Duration */}
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Leave Duration:</span>
                            <Badge variant="outline">
                                {new Date(classInfo.leaveStartDate).toLocaleDateString()} - {new Date(classInfo.leaveEndDate).toLocaleDateString()}
                            </Badge>
                            <Badge variant="secondary">
                                {classInfo.leaveDays} days
                            </Badge>
                        </div>

                        {/* Delegation Status */}
                        {hasDelegation ? (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Substitute Teacher Assigned</p>
                                    <p className="font-medium text-green-600 dark:text-green-500">
                                        {classInfo.substituteTeacherName}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <Button 
                                onClick={() => onAssign(classInfo)} 
                                className="w-full"
                                variant="default"
                            >
                                <UserCheck className="w-4 h-4 mr-2" />
                                Assign Substitute Teacher
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ActiveDelegationCard({ delegation, onUpdate }) {
    const updateMutation = useMutation({
        mutationFn: async (status) => {
            const res = await fetch(`/api/schools/${delegation.schoolId}/attendance/delegations`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ delegationId: delegation.id, status })
            });
            if (!res.ok) throw new Error('Failed to update');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Delegation updated successfully');
            onUpdate();
        },
        onError: () => toast.error('Failed to update delegation')
    });

    return (
        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Award className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <p className="font-medium">
                        {delegation.class.className}
                        {delegation.section && ` - ${delegation.section.name}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {delegation.substituteTeacher.name} → {delegation.originalTeacher.name}
                    </p>
                </div>
            </div>
            <Button 
                variant="outline" 
                size="sm"
                onClick={() => updateMutation.mutate('COMPLETED')}
                disabled={updateMutation.isPending}
            >
                End Delegation
            </Button>
        </div>
    );
}

function AssignmentModal({ classInfo, schoolId, userId, availableTeachers, onClose, onSuccess }) {
    const [selectedTeacher, setSelectedTeacher] = useState('');

    const createMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/delegations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalTeacherId: classInfo.teacherId,
                    substituteTeacherId: selectedTeacher,
                    classId: classInfo.classId,
                    sectionId: classInfo.sectionId || null,
                    startDate: classInfo.leaveStartDate,
                    endDate: classInfo.leaveEndDate,
                    reason: `Teacher on ${classInfo.leaveType} leave`,
                    createdById: userId
                })
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to create delegation');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Substitute teacher assigned successfully');
            onSuccess();
        },
        onError: (err) => toast.error(err.message)
    });

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Assign Substitute Teacher</DialogTitle>
                    <DialogDescription>
                        Select a substitute teacher for {classInfo.className}
                        {classInfo.sectionName && ` - ${classInfo.sectionName}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Class Info */}
                    <Card className="border-muted">
                        <CardContent className="pt-6 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Class:</span>
                                <span className="font-medium">{classInfo.className}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Students:</span>
                                <span className="font-medium">{classInfo.studentCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Absent Teacher:</span>
                                <span className="font-medium">{classInfo.teacherName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Duration:</span>
                                <Badge variant="secondary">{classInfo.leaveDays} days</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Teacher Selection */}
                    <div className="space-y-2">
                        <Label>Select Substitute Teacher *</Label>
                        <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a teacher..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableTeachers.map((teacher) => (
                                    <SelectItem key={teacher.userId} value={teacher.userId}>
                                        {teacher.name} ({teacher.employeeId}) - {teacher.designation}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Info */}
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">
                            The substitute teacher will be able to mark attendance for this class only for TODAY.
                            The delegation will automatically expire after the leave period ends.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" className="flex-1" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={() => createMutation.mutate()}
                            disabled={!selectedTeacher || createMutation.isPending}
                        >
                            {createMutation.isPending ? 'Assigning...' : 'Assign Teacher'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
    Users,
    CheckCircle,
    XCircle,
    Loader2,
    FileText,
    Filter,
    Search
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

export default function AssignFeesToStudents() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [selectedStructure, setSelectedStructure] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [applyToAll, setApplyToAll] = useState(false);
    const [search, setSearch] = useState('');

    // Fetch academic years
    const { data: academicYears } = useQuery({
        queryKey: ['academic-years', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId,
    });

    const academicYearId = academicYears?.find(y => y.isActive)?.id;

    // Fetch fee structures
    const { data: structures } = useQuery({
        queryKey: ['fee-structures', schoolId, academicYearId],
        queryFn: async () => {
            const params = new URLSearchParams({ schoolId, academicYearId });
            const res = await fetch(`/api/schools/fee/global-structures?${params}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId && !!academicYearId,
    });

    // Fetch classes
    const { data: classes } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId,
    });
    console.log(classes);

    // Fetch sections based on selected class
    const sections = classes?.find(c => c.id.toString() === selectedClass)?.sections || [];

    // Fetch students
    const { data: students, isLoading: studentsLoading } = useQuery({
        queryKey: ['students-assign', schoolId, selectedClass, selectedSection],
        queryFn: async () => {
            const params = new URLSearchParams({
                schoolId,
                ...(selectedClass && { classId: selectedClass }),
                ...(selectedSection && { sectionId: selectedSection }),
            });
            const res = await fetch(`/api/students?${params}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId && !!selectedClass,
    });

    // Assign mutation
    const assignMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch('/api/schools/fee/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error);
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(`Fee assigned to ${data.assigned} students`);
            if (data.skipped > 0) {
                toast.info(`${data.skipped} students skipped (already assigned)`);
            }
            queryClient.invalidateQueries(['students-assign']);
            setSelectedStudents([]);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleAssign = () => {
        if (!selectedStructure) {
            toast.error('Please select a fee structure');
            return;
        }

        if (!applyToAll && selectedStudents.length === 0) {
            toast.error('Please select at least one student');
            return;
        }

        assignMutation.mutate({
            globalFeeStructureId: selectedStructure,
            studentIds: applyToAll ? undefined : selectedStudents,
            applyToClass: applyToAll,
            classId: selectedClass,
            sectionId: selectedSection || undefined,
            academicYearId,
            schoolId,
        });
    };

    const toggleStudent = (studentId) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const toggleAll = () => {
        if (selectedStudents.length === filteredStudents?.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(filteredStudents?.map(s => s.userId) || []);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const selectedStructureData = structures?.find(s => s.id === selectedStructure);

    const filteredStudents = students?.filter(student =>
        search === '' ||
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.admissionNo.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                    <Users className="w-8 h-8 text-blue-600" />
                    Assign Fee Structure to Students
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Assign global fee structures to students in bulk or individually
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel - Selection */}
                <div className="lg:col-span-1 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Fee Structure</CardTitle>
                            <CardDescription>Choose a fee structure to assign</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Fee Structure */}
                            <div className="space-y-2">
                                <Label>Fee Structure *</Label>
                                <Select value={selectedStructure} onValueChange={setSelectedStructure}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select structure..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {structures?.map((structure) => (
                                            <SelectItem key={structure.id} value={structure.id}>
                                                <div className="flex flex-col">
                                                    <span>{structure.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {structure.class.className} • {formatCurrency(structure.totalAmount)}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Class */}

                            <div className="space-y-2">
                                <Label>Class *</Label>
                                <Select
                                    value={selectedClass || ""}
                                    onValueChange={setSelectedClass}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select class..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.isArray(classes) &&
                                            classes
                                                .filter((cls) => cls?.id && cls?.className)
                                                .map((cls) => (
                                                    <SelectItem key={cls.id} value={String(cls.id)}>
                                                        {cls.className}
                                                    </SelectItem>
                                                ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Section */}
                            {sections.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Section (Optional)</Label>
                                    <Select
                                        value={selectedSection || ""}
                                        onValueChange={setSelectedSection}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All sections" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Sections</SelectItem>
                                            {sections
                                                .filter((section) => section?.id && section?.name)
                                                .map((section) => (
                                                    <SelectItem key={section.id} value={String(section.id)}>
                                                        {section.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Apply to All */}
                            <div className="flex items-center space-x-2 p-3 border rounded-lg">
                                <Checkbox
                                    checked={applyToAll}
                                    onCheckedChange={setApplyToAll}
                                />
                                <label className="text-sm font-medium leading-none">
                                    Apply to all students in {selectedSection ? 'section' : 'class'}
                                </label>
                            </div>

                            {/* Assign Button */}
                            <Button
                                className="w-full"
                                onClick={handleAssign}
                                disabled={assignMutation.isPending || !selectedStructure || !selectedClass}
                            >
                                {assignMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Assigning...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Assign Fee Structure
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Selected Structure Details */}
                    {selectedStructureData && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Structure Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Amount</p>
                                        <p className="text-2xl font-bold">
                                            {formatCurrency(selectedStructureData.totalAmount)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Payment Mode</p>
                                        <Badge variant="outline">{selectedStructureData.mode}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2">Particulars</p>
                                        {selectedStructureData.particulars.map((particular) => (
                                            <div
                                                key={particular.id}
                                                className="flex items-center justify-between text-sm py-1"
                                            >
                                                <span>{particular.name}</span>
                                                <span className="font-medium">
                                                    {formatCurrency(particular.defaultAmount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Panel - Students List */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Students</CardTitle>
                                    <CardDescription>
                                        {selectedStudents.length > 0 && !applyToAll
                                            ? `${selectedStudents.length} selected`
                                            : filteredStudents?.length || 0} students
                                    </CardDescription>
                                </div>
                                {!applyToAll && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={toggleAll}
                                        disabled={!filteredStudents?.length}
                                    >
                                        {selectedStudents.length === filteredStudents?.length ? 'Deselect All' : 'Select All'}
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Search */}
                            <div className="mb-4 relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search students..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Students List */}
                            {studentsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : !selectedClass ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p>Select a class to view students</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {filteredStudents?.map((student) => {
                                        const isSelected = selectedStudents.includes(student.userId);
                                        const hasExistingFee = student.studentFees?.some(f => f.academicYearId === academicYearId);

                                        return (
                                            <div
                                                key={student.userId}
                                                className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${isSelected ? 'bg-blue-50 border-blue-300' : 'hover:bg-accent'
                                                    } ${hasExistingFee ? 'opacity-60' : ''}`}
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    {!applyToAll && (
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => toggleStudent(student.userId)}
                                                            disabled={hasExistingFee}
                                                        />
                                                    )}
                                                    <div className="flex-1">
                                                        <p className="font-medium">{student.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {student.admissionNo} • Roll: {student.rollNumber}
                                                        </p>
                                                    </div>
                                                </div>
                                                {hasExistingFee ? (
                                                    <Badge variant="secondary" className="flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Assigned
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">
                                                        Not Assigned
                                                    </Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
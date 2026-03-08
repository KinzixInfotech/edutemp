'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
    Users,
    CheckCircle,
    XCircle,
    Loader2,
    FileText,
    Search,
    ChevronLeft,
    ChevronRight,
    CheckSquare,
    Square,
    DollarSign,
    AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const STUDENTS_PER_PAGE = 15;

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
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch academic years
    const { data: academicYears } = useQuery({
        queryKey: ['academic-years', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60 * 5,
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
        staleTime: 1000 * 60 * 5,
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
        staleTime: 1000 * 60 * 5,
    });

    // Fetch sections based on selected class
    const sections = classes?.find(c => c.id.toString() === selectedClass)?.sections || [];

    // Fetch students
    const { data: students, isLoading: studentsLoading } = useQuery({
        queryKey: ['students-assign', schoolId, selectedClass, selectedSection],
        queryFn: async () => {
            const params = new URLSearchParams({
                schoolId,
                ...(selectedClass && { classId: selectedClass }),
                ...(selectedSection && selectedSection !== 'all' && { sectionId: selectedSection }),
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
            setApplyToAll(false);
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
            sectionId: selectedSection && selectedSection !== 'all' ? selectedSection : undefined,
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

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const selectedStructureData = structures?.find(s => s.id === selectedStructure);

    // Filter students
    const filteredStudents = useMemo(() => {
        if (!students) return [];
        return students.filter(student =>
            search === '' ||
            student.name.toLowerCase().includes(search.toLowerCase()) ||
            student.admissionNo?.toLowerCase().includes(search.toLowerCase())
        );
    }, [students, search]);

    // Classify students: assigned vs unassigned
    const assignmentStats = useMemo(() => {
        if (!filteredStudents.length) return { assigned: 0, unassigned: 0, total: 0 };
        const assigned = filteredStudents.filter(s => s.studentFees?.some(f => f.academicYearId === academicYearId)).length;
        return {
            assigned,
            unassigned: filteredStudents.length - assigned,
            total: filteredStudents.length,
        };
    }, [filteredStudents, academicYearId]);

    // Paginate
    const paginatedStudents = useMemo(() => {
        const totalPages = Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE);
        const items = filteredStudents.slice(
            (currentPage - 1) * STUDENTS_PER_PAGE,
            currentPage * STUDENTS_PER_PAGE
        );
        return { items, totalPages, total: filteredStudents.length };
    }, [filteredStudents, currentPage]);

    // Mark all unassigned on current page
    const selectAllOnPage = () => {
        const unassignedOnPage = paginatedStudents.items
            .filter(s => !s.studentFees?.some(f => f.academicYearId === academicYearId))
            .map(s => s.userId);
        const allCurrentlySelected = unassignedOnPage.every(id => selectedStudents.includes(id));

        if (allCurrentlySelected) {
            setSelectedStudents(prev => prev.filter(id => !unassignedOnPage.includes(id)));
        } else {
            setSelectedStudents(prev => [...new Set([...prev, ...unassignedOnPage])]);
        }
    };

    // Select ALL unassigned students across all pages
    const selectAllStudents = () => {
        const allUnassigned = filteredStudents
            .filter(s => !s.studentFees?.some(f => f.academicYearId === academicYearId))
            .map(s => s.userId);

        if (selectedStudents.length === allUnassigned.length) {
            setSelectedStudents([]);
        } else {
            setSelectedStudents(allUnassigned);
        }
    };

    // Are all unassigned on this page selected?
    const allOnPageSelected = useMemo(() => {
        const unassignedOnPage = paginatedStudents.items
            .filter(s => !s.studentFees?.some(f => f.academicYearId === academicYearId))
            .map(s => s.userId);
        return unassignedOnPage.length > 0 && unassignedOnPage.every(id => selectedStudents.includes(id));
    }, [paginatedStudents.items, selectedStudents, academicYearId]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                    <Users className="w-8 h-8 text-blue-600" />
                    Assign Fee Structure
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
                            <CardTitle className="text-base">Select Fee Structure</CardTitle>
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
                                    onValueChange={(val) => {
                                        setSelectedClass(val);
                                        setSelectedSection('');
                                        setSelectedStudents([]);
                                        setCurrentPage(1);
                                    }}
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
                                        onValueChange={(val) => {
                                            setSelectedSection(val);
                                            setSelectedStudents([]);
                                            setCurrentPage(1);
                                        }}
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
                            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/30">
                                <Checkbox
                                    checked={applyToAll}
                                    onCheckedChange={(checked) => {
                                        setApplyToAll(checked);
                                        if (checked) setSelectedStudents([]);
                                    }}
                                />
                                <label className="text-sm font-medium leading-none cursor-pointer">
                                    Apply to all students in {selectedSection && selectedSection !== 'all' ? 'section' : 'class'}
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
                                        {selectedStudents.length > 0 && !applyToAll && (
                                            <Badge className="ml-2 bg-white text-blue-600">{selectedStudents.length}</Badge>
                                        )}
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Selected Structure Details */}
                    {selectedStructureData && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Structure Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Amount</p>
                                            <p className="text-2xl font-bold">
                                                {formatCurrency(selectedStructureData.totalAmount)}
                                            </p>
                                        </div>
                                        <DollarSign className="w-8 h-8 text-blue-500 opacity-30" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Payment Mode</p>
                                        <Badge variant="outline">{selectedStructureData.mode}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-2">Particulars</p>
                                        <div className="divide-y rounded-lg border">
                                            {selectedStructureData.particulars.map((particular) => (
                                                <div
                                                    key={particular.id}
                                                    className="flex items-center justify-between text-sm p-2.5"
                                                >
                                                    <span>{particular.name}</span>
                                                    <span className="font-medium">
                                                        {formatCurrency(particular.defaultAmount)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Assignment Stats */}
                    {selectedClass && !studentsLoading && filteredStudents.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Assignment Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Total Students</span>
                                        <Badge variant="outline">{assignmentStats.total}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-green-600 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> Assigned
                                        </span>
                                        <Badge className="bg-green-100 text-green-700">{assignmentStats.assigned}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-amber-600 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Unassigned
                                        </span>
                                        <Badge className="bg-amber-100 text-amber-700">{assignmentStats.unassigned}</Badge>
                                    </div>
                                    {/* Progress */}
                                    <div className="mt-2">
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full bg-green-500 transition-all duration-500"
                                                style={{ width: `${assignmentStats.total > 0 ? (assignmentStats.assigned / assignmentStats.total * 100) : 0}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 text-center">
                                            {assignmentStats.total > 0
                                                ? `${Math.round(assignmentStats.assigned / assignmentStats.total * 100)}% assigned`
                                                : '0% assigned'}
                                        </p>
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
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <CardTitle>Students</CardTitle>
                                    <CardDescription>
                                        {selectedStudents.length > 0 && !applyToAll
                                            ? `${selectedStudents.length} of ${filteredStudents.length} selected`
                                            : `${filteredStudents.length || 0} students`}
                                        {applyToAll && (
                                            <span className="text-blue-600 font-medium ml-1">(All will be assigned)</span>
                                        )}
                                    </CardDescription>
                                </div>
                                {!applyToAll && filteredStudents.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={selectAllOnPage}
                                            disabled={!paginatedStudents.items.length}
                                            className="text-xs"
                                        >
                                            {allOnPageSelected ? (
                                                <><Square className="w-3 h-3 mr-1" /> Deselect Page</>
                                            ) : (
                                                <><CheckSquare className="w-3 h-3 mr-1" /> Select Page</>
                                            )}
                                        </Button>
                                        <Button
                                            variant={selectedStudents.length === assignmentStats.unassigned ? "secondary" : "default"}
                                            size="sm"
                                            onClick={selectAllStudents}
                                            disabled={assignmentStats.unassigned === 0}
                                            className="text-xs"
                                        >
                                            {selectedStudents.length === assignmentStats.unassigned && assignmentStats.unassigned > 0 ? (
                                                <><Square className="w-3 h-3 mr-1" /> Deselect All</>
                                            ) : (
                                                <><CheckSquare className="w-3 h-3 mr-1" /> Mark All ({assignmentStats.unassigned})</>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Search */}
                            <div className="mb-4 relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search students by name or admission no..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
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
                            ) : filteredStudents.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                    <p>No students found{search ? ` matching "${search}"` : ''}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        {paginatedStudents.items.map((student) => {
                                            const isSelected = selectedStudents.includes(student.userId);
                                            const hasExistingFee = student.studentFees?.some(f => f.academicYearId === academicYearId);

                                            return (
                                                <div
                                                    key={student.userId}
                                                    onClick={() => {
                                                        if (!applyToAll && !hasExistingFee) toggleStudent(student.userId);
                                                    }}
                                                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors cursor-pointer ${isSelected
                                                        ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700'
                                                        : 'hover:bg-accent'
                                                        } ${hasExistingFee ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3 flex-1">
                                                        {!applyToAll && (
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={() => toggleStudent(student.userId)}
                                                                disabled={hasExistingFee}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate">{student.name}</p>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <span>{student.admissionNo}</span>
                                                                {student.rollNumber && (
                                                                    <span>• Roll: {student.rollNumber}</span>
                                                                )}
                                                                {student.section?.name && (
                                                                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                                                                        {student.section.name}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {hasExistingFee ? (
                                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Assigned
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                                                            Not Assigned
                                                        </Badge>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Pagination */}
                                    {paginatedStudents.totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                            <p className="text-sm text-muted-foreground">
                                                Showing {(currentPage - 1) * STUDENTS_PER_PAGE + 1} to {Math.min(currentPage * STUDENTS_PER_PAGE, paginatedStudents.total)} of {paginatedStudents.total}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    <ChevronLeft className="w-4 h-4" />
                                                </Button>
                                                <span className="text-sm px-2">
                                                    {currentPage} / {paginatedStudents.totalPages}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(p => Math.min(paginatedStudents.totalPages, p + 1))}
                                                    disabled={currentPage === paginatedStudents.totalPages}
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
    User,
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Edit,
    CreditCard,
    BookOpen,
    FileText,
    School,
    GraduationCap,
    Clock,
    CheckCircle,
    Loader2,
    Users,
    IndianRupee,
    Save,
    TrendingUp
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { useAuth } from '@/context/AuthContext';
import { cn } from "@/lib/utils";

export default function StudentProfilePage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const studentId = params.studentId;

    const [activeTab, setActiveTab] = useState('overview');
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editForm, setEditForm] = useState({});

    // Fetch Student Data
    const { data: student, isLoading } = useQuery({
        queryKey: ['student-profile', studentId],
        queryFn: async () => {
            const res = await axios.get(`/api/students/${studentId}`);
            return res.data;
        },
        enabled: !!schoolId && !!studentId,
        staleTime: 1000 * 60 * 5,
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const res = await axios.patch(`/api/students/${studentId}`, data);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Student updated successfully!');
            queryClient.invalidateQueries(['student-profile', studentId]);
            setIsEditOpen(false);
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to update');
        }
    });

    const handleEditOpen = () => {
        setEditForm({
            name: student?.name || '',
            email: student?.user?.email || '',
            rollNumber: student?.rollNumber || '',
            dob: student?.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
            gender: student?.gender || '',
            bloodGroup: student?.bloodGroup || '',
            Address: student?.Address || '',
            city: student?.city || '',
            state: student?.state || '',
            postalCode: student?.postalCode || '',
        });
        setIsEditOpen(true);
    };

    const handleSave = () => {
        updateMutation.mutate(editForm);
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <User className="h-12 w-12 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Student Not Found</h2>
                <Button onClick={() => router.back()} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span className="cursor-pointer hover:text-foreground" onClick={() => router.push(`/dashboard/schools/manage-student`)}>
                            Students
                        </span>
                        <span>/</span>
                        <span className="text-foreground">{student.name}</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
                        <span>Student Profile</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        View and manage student information
                    </p>
                </div>
                <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <SheetTrigger asChild>
                        <Button onClick={handleEditOpen} className="w-full sm:w-auto" size="sm">
                            <Edit className="mr-2 h-4 w-4" /> Edit Profile
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="sm:max-w-lg overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>Edit Student</SheetTitle>
                            <SheetDescription>Update student information</SheetDescription>
                        </SheetHeader>
                        <div className="grid gap-4 py-6">
                            <div className="grid gap-2">
                                <Label>Full Name</Label>
                                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Email</Label>
                                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Roll Number</Label>
                                    <Input value={editForm.rollNumber} onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Date of Birth</Label>
                                    <Input type="date" value={editForm.dob} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Gender</Label>
                                    <Select value={editForm.gender} onValueChange={(val) => setEditForm({ ...editForm, gender: val })}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MALE">Male</SelectItem>
                                            <SelectItem value="FEMALE">Female</SelectItem>
                                            <SelectItem value="OTHER">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Blood Group</Label>
                                    <Select value={editForm.bloodGroup} onValueChange={(val) => setEditForm({ ...editForm, bloodGroup: val })}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                                                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Address</Label>
                                <Input value={editForm.Address} onChange={(e) => setEditForm({ ...editForm, Address: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label>City</Label>
                                    <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>State</Label>
                                    <Input value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>ZIP</Label>
                                    <Input value={editForm.postalCode} onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <SheetFooter>
                            <SheetClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </SheetClose>
                            <Button onClick={handleSave} disabled={updateMutation.isPending}>
                                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Profile Card */}
            <Card>
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                        <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                            <AvatarImage src={student.user?.profilePicture} className="object-cover" />
                            <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                                {student.name?.[0]?.toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-bold">{student.name}</h2>
                                <Badge variant={student.user?.status === 'ACTIVE' ? 'default' : 'destructive'}>
                                    {student.user?.status}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{student.class?.className || 'N/A'} - {student.section?.name || 'N/A'}</Badge>
                                {student.rollNumber && <Badge variant="secondary">Roll #{student.rollNumber}</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <span>Adm No: {student.admissionNo || 'N/A'}</span>
                                {student.user?.email && <span>{student.user.email}</span>}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Cards - Consistent with system design */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {student.hasFees && student.stats?.feeStatus && (
                    <Card className={cn(
                        student.stats.feeStatus === 'Paid'
                            ? "bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20"
                            : "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20"
                    )}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Fee Status</p>
                                <p className={cn("text-2xl font-bold", student.stats.feeStatus === 'Paid' ? "text-green-600" : "text-red-600")}>
                                    {student.stats.feeStatus}
                                </p>
                            </div>
                            <div className={cn("p-3 rounded-full", student.stats.feeStatus === 'Paid' ? "bg-green-500/20" : "bg-red-500/20")}>
                                <IndianRupee className={cn("h-6 w-6", student.stats.feeStatus === 'Paid' ? "text-green-500" : "text-red-500")} />
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Attendance</p>
                            <p className="text-2xl font-bold">{student.stats?.attendance || 0}%</p>
                        </div>
                        <div className="p-3 rounded-full bg-blue-500/20">
                            <Clock className="h-6 w-6 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                {student.hasExams && student.stats?.performance && (
                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Performance</p>
                                <p className="text-2xl font-bold">{student.stats.performance}</p>
                            </div>
                            <div className="p-3 rounded-full bg-purple-500/20">
                                <TrendingUp className="h-6 w-6 text-purple-500" />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {student.stats?.pendingTasks > 0 && (
                    <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Tasks</p>
                                <p className="text-2xl font-bold">{student.stats.pendingTasks}</p>
                            </div>
                            <div className="p-3 rounded-full bg-amber-500/20">
                                <FileText className="h-6 w-6 text-amber-500" />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="personal">Personal</TabsTrigger>
                    <TabsTrigger value="fees">Fees</TabsTrigger>
                    <TabsTrigger value="academics">Academics</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <User className="h-4 w-4" /> Basic Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <dt className="text-muted-foreground">Email</dt>
                                        <dd className="font-medium truncate">{student.user?.email || '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Date of Birth</dt>
                                        <dd className="font-medium">{student.dob ? new Date(student.dob).toLocaleDateString() : '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Gender</dt>
                                        <dd className="font-medium capitalize">{student.gender?.toLowerCase() || '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Blood Group</dt>
                                        <dd className="font-medium">{student.bloodGroup || '-'}</dd>
                                    </div>
                                </dl>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Guardians
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {student.FatherName && (
                                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Father</p>
                                            <p className="font-medium">{student.FatherName}</p>
                                        </div>
                                        {student.FatherNumber && <Badge variant="secondary">{student.FatherNumber}</Badge>}
                                    </div>
                                )}
                                {student.MotherName && (
                                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Mother</p>
                                            <p className="font-medium">{student.MotherName}</p>
                                        </div>
                                        {student.MotherNumber && <Badge variant="secondary">{student.MotherNumber}</Badge>}
                                    </div>
                                )}
                                {!student.FatherName && !student.MotherName && (
                                    <p className="text-sm text-muted-foreground text-center py-4">No guardian information</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {student.hasFees && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <IndianRupee className="h-4 w-4" /> Fee Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                                        <p className="text-xs text-muted-foreground">Total</p>
                                        <p className="text-xl font-bold">₹{student.stats?.totalFeeAmount?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="text-center p-3 bg-green-500/10 rounded-lg">
                                        <p className="text-xs text-muted-foreground">Paid</p>
                                        <p className="text-xl font-bold text-green-600">₹{student.stats?.totalPaidAmount?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="text-center p-3 bg-red-500/10 rounded-lg">
                                        <p className="text-xs text-muted-foreground">Balance</p>
                                        <p className="text-xl font-bold text-red-600">₹{student.stats?.totalBalanceAmount?.toLocaleString() || 0}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* PERSONAL TAB */}
                <TabsContent value="personal">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                        <MapPin className="h-4 w-4" /> Address
                                    </h4>
                                    <div className="p-4 bg-muted/50 rounded-lg text-sm">
                                        <p className="font-medium">{student.Address || 'No address'}</p>
                                        {(student.city || student.state) && (
                                            <p className="text-muted-foreground">{student.city}{student.city && student.state && ', '}{student.state}</p>
                                        )}
                                        {(student.country || student.postalCode) && (
                                            <p className="text-muted-foreground">{student.country} {student.postalCode}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                        <School className="h-4 w-4" /> Admission Details
                                    </h4>
                                    <div className="p-4 bg-muted/50 rounded-lg">
                                        <dl className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <dt className="text-muted-foreground">Admission Date</dt>
                                                <dd className="font-medium">{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '-'}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-muted-foreground">Previous School</dt>
                                                <dd className="font-medium">{student.PreviousSchoolName || '-'}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FEES TAB */}
                <TabsContent value="fees">
                    {student.studentFees?.length > 0 ? (
                        <div className="space-y-4">
                            {student.studentFees.map(fee => (
                                <Card key={fee.id}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-base">{fee.globalFeeStructure?.name || 'Fee'}</CardTitle>
                                                <CardDescription>{fee.academicYear?.name}</CardDescription>
                                            </div>
                                            <Badge variant={fee.status === 'PAID' ? 'default' : fee.status === 'PARTIAL' ? 'secondary' : 'destructive'}>
                                                {fee.status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div className="p-3 bg-muted/50 rounded-lg text-center">
                                                <p className="text-muted-foreground text-xs">Total</p>
                                                <p className="font-bold text-lg">₹{fee.finalAmount?.toLocaleString()}</p>
                                            </div>
                                            <div className="p-3 bg-green-500/10 rounded-lg text-center">
                                                <p className="text-muted-foreground text-xs">Paid</p>
                                                <p className="font-bold text-lg text-green-600">₹{fee.paidAmount?.toLocaleString()}</p>
                                            </div>
                                            <div className="p-3 bg-red-500/10 rounded-lg text-center">
                                                <p className="text-muted-foreground text-xs">Balance</p>
                                                <p className="font-bold text-lg text-red-600">₹{fee.balanceAmount?.toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {fee.installments?.length > 0 && (
                                            <div className="mt-4 pt-4 border-t space-y-2">
                                                <p className="text-xs font-medium text-muted-foreground">Installments</p>
                                                {fee.installments.map(inst => (
                                                    <div key={inst.id} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded">
                                                        <span>{inst.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground text-xs">{new Date(inst.dueDate).toLocaleDateString()}</span>
                                                            <span className="font-medium">₹{inst.amount?.toLocaleString()}</span>
                                                            <Badge variant={inst.status === 'PAID' ? 'default' : 'outline'} className="text-xs">
                                                                {inst.status}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="font-medium">No Fee Structures</h3>
                                <p className="text-sm text-muted-foreground mb-4">No fees assigned to this student</p>
                                <Button variant="outline" onClick={() => router.push(`/dashboard/fees/assign`)}>
                                    Assign Fee Structure
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* ACADEMICS TAB */}
                <TabsContent value="academics">
                    {student.examResults?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {student.examResults.map(result => (
                                <Card key={result.id}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">{result.exam?.title || 'Exam'}</CardTitle>
                                        <CardDescription>{result.subject?.subjectName}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-2xl font-bold">{result.marksObtained || '-'}</p>
                                                <p className="text-xs text-muted-foreground">Grade: {result.grade || 'N/A'}</p>
                                            </div>
                                            {result.remarks && (
                                                <p className="text-xs text-muted-foreground italic max-w-[100px] truncate">
                                                    "{result.remarks}"
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="font-medium">No Exam Results</h3>
                                <p className="text-sm text-muted-foreground">Results will appear after exams</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* DOCUMENTS TAB */}
                <TabsContent value="documents">
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="font-medium">No Documents</h3>
                            <p className="text-sm text-muted-foreground">Documents will appear here</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

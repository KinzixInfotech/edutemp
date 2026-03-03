'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
    ArrowLeft,
    Edit,
    User,
    Mail,
    Phone,
    Calendar,
    MapPin,
    Briefcase,
    Building2,
    CreditCard,
    Clock,
    Droplets,
    GraduationCap,
    HardHat,
    CalendarDays,
    DollarSign,
    FileText,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
} from 'lucide-react';

function calculateAge(dob) {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function InfoItem({ icon: Icon, label, value, className }) {
    return (
        <div className={cn("flex items-start gap-3 py-2", className)}>
            <div className="mt-0.5 p-1.5 rounded-md bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium truncate">{value || 'N/A'}</p>
            </div>
        </div>
    );
}

function LeaveStatusBadge({ status }) {
    const variants = {
        PENDING: { className: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400", icon: AlertCircle },
        APPROVED: { className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400", icon: CheckCircle2 },
        REJECTED: { className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400", icon: XCircle },
    };
    const variant = variants[status] || variants.PENDING;
    const StatusIcon = variant.icon;
    return (
        <Badge variant="outline" className={cn("text-xs gap-1", variant.className)}>
            <StatusIcon className="h-3 w-3" />
            {status}
        </Badge>
    );
}

export default function StaffProfilePage() {
    const { schoolId, staffId } = useParams();
    const router = useRouter();
    const { fullUser } = useAuth();

    // Fetch staff detail
    const { data: staffDetail, isLoading: isLoadingStaff } = useQuery({
        queryKey: ['staff-detail', schoolId, staffId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/staff/${staffId}`);
            return res.data;
        },
        enabled: !!schoolId && !!staffId,
    });

    // Fetch payroll profile
    const { data: payrollData } = useQuery({
        queryKey: ['staff-payroll', schoolId, staffId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/payroll/employees`, {
                params: { limit: 500 },
            });
            const all = res.data?.employees || [];
            return all.find(emp => emp.userId === staffId) || null;
        },
        enabled: !!schoolId && !!staffId,
    });

    // Fetch leave balance
    const { data: leaveBalance } = useQuery({
        queryKey: ['staff-leave-balance', schoolId, staffId],
        queryFn: async () => {
            try {
                const res = await axios.get(`/api/schools/${schoolId}/leaves/balance`, {
                    params: { userId: staffId },
                });
                return res.data?.balance || res.data || null;
            } catch {
                return null;
            }
        },
        enabled: !!schoolId && !!staffId,
    });

    // Fetch leave requests
    const { data: leaveRequests = [] } = useQuery({
        queryKey: ['staff-leave-requests', schoolId, staffId],
        queryFn: async () => {
            try {
                const res = await axios.get(`/api/schools/${schoolId}/leaves`, {
                    params: { userId: staffId, limit: 10 },
                });
                return res.data?.data || res.data?.requests || [];
            } catch {
                return [];
            }
        },
        enabled: !!schoolId && !!staffId,
    });

    const age = calculateAge(staffDetail?.dob);
    const isTeaching = staffDetail?.type === 'teaching';

    if (isLoadingStaff) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-20 w-20 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-40" />
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
                            <CardContent className="space-y-3">
                                {Array.from({ length: 3 }).map((__, j) => (
                                    <Skeleton key={j} className="h-10 w-full" />
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!staffDetail) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto text-center py-20">
                <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Staff member not found</h2>
                <p className="text-muted-foreground mb-4">The staff member you are looking for does not exist or has been removed.</p>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/schools/${schoolId}/profiles/${isTeaching ? 'teacher' : 'non-teaching'}/${staffId}/edit`)}
                >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                </Button>
            </div>

            {/* Profile Card */}
            <Card className="overflow-hidden">
                <div className={cn(
                    "h-24 sm:h-32",
                    isTeaching
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                        : "bg-gradient-to-r from-purple-500 to-pink-600"
                )} />
                <CardContent className="relative pb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12 sm:-mt-16">
                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-lg">
                            <AvatarImage src={staffDetail.profilePicture} />
                            <AvatarFallback className="text-xl sm:text-2xl font-bold">
                                {staffDetail.name?.[0]?.toUpperCase() || "S"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 pt-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold truncate">{staffDetail.name}</h1>
                                <div className="flex items-center gap-2">
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-xs",
                                            staffDetail.status === "ACTIVE"
                                                ? "bg-green-100 text-green-700 border-green-200"
                                                : "bg-red-100 text-red-700 border-red-200"
                                        )}
                                    >
                                        {staffDetail.status}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs gap-1">
                                        {isTeaching ? <GraduationCap className="h-3 w-3" /> : <HardHat className="h-3 w-3" />}
                                        {isTeaching ? 'Teaching' : 'Non-Teaching'}
                                    </Badge>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {staffDetail.designation || 'No designation'} • Employee ID: {staffDetail.employeeId || 'N/A'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Personal Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <InfoItem icon={Calendar} label="Date of Birth" value={formatDate(staffDetail.dob)} />
                        {age !== null && <InfoItem icon={Clock} label="Age" value={`${age} years`} />}
                        <InfoItem icon={User} label="Gender" value={staffDetail.gender} />
                        <InfoItem icon={Droplets} label="Blood Group" value={staffDetail.bloodGroup} />
                    </CardContent>
                </Card>

                {/* Contact Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Contact Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <InfoItem icon={Mail} label="Email" value={staffDetail.email} />
                        <InfoItem icon={Phone} label="Phone" value={staffDetail.contactNumber || staffDetail.phone} />
                        <InfoItem icon={MapPin} label="Address" value={staffDetail.address} />
                        <InfoItem
                            icon={Building2}
                            label="City / State / Country"
                            value={[staffDetail.city, staffDetail.state, staffDetail.country].filter(Boolean).join(', ') || 'N/A'}
                        />
                    </CardContent>
                </Card>

                {/* Employment Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Employment Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <InfoItem icon={CreditCard} label="Employee ID" value={staffDetail.employeeId} />
                        <InfoItem icon={Briefcase} label="Designation" value={staffDetail.designation} />
                        <InfoItem icon={CalendarDays} label="Joining Date" value={formatDate(payrollData?.joiningDate)} />
                        <InfoItem icon={FileText} label="Employment Type" value={payrollData?.employmentType || 'N/A'} />
                    </CardContent>
                </Card>

                {/* Payroll Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Payroll Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {payrollData ? (
                            <div className="space-y-1">
                                <InfoItem icon={DollarSign} label="Salary Structure" value={payrollData.salaryStructure?.name || 'N/A'} />
                                <InfoItem icon={DollarSign} label="Gross Salary" value={
                                    payrollData.salaryStructure?.grossSalary
                                        ? `₹${Number(payrollData.salaryStructure.grossSalary).toLocaleString('en-IN')}`
                                        : 'N/A'
                                } />
                                <InfoItem icon={CreditCard} label="Bank" value={
                                    [payrollData.bankName, payrollData.bankBranch].filter(Boolean).join(' - ') || 'N/A'
                                } />
                                <InfoItem icon={CreditCard} label="Account Number" value={payrollData.accountNumber || 'N/A'} />
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <DollarSign className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">No payroll profile found</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Leave Balance */}
            {leaveBalance && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            Leave Balance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: 'Casual Leave', used: leaveBalance.casualLeaveUsed, total: leaveBalance.casualLeaveTotal, color: 'blue' },
                                { label: 'Sick Leave', used: leaveBalance.sickLeaveUsed, total: leaveBalance.sickLeaveTotal, color: 'red' },
                                { label: 'Earned Leave', used: leaveBalance.earnedLeaveUsed, total: leaveBalance.earnedLeaveTotal, color: 'green' },
                                { label: 'Maternity Leave', used: leaveBalance.maternityLeaveUsed, total: leaveBalance.maternityLeaveTotal, color: 'purple' },
                            ].map(leave => (
                                <div key={leave.label} className="p-3 rounded-lg border bg-muted/30">
                                    <p className="text-xs text-muted-foreground mb-1">{leave.label}</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-bold">{leave.total - leave.used}</span>
                                        <span className="text-xs text-muted-foreground">/ {leave.total}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all",
                                                leave.color === 'blue' && "bg-blue-500",
                                                leave.color === 'red' && "bg-red-500",
                                                leave.color === 'green' && "bg-green-500",
                                                leave.color === 'purple' && "bg-purple-500"
                                            )}
                                            style={{ width: `${leave.total > 0 ? ((leave.total - leave.used) / leave.total) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Leave Requests */}
            {leaveRequests.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Recent Leave Requests
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {leaveRequests.slice(0, 5).map(req => (
                                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-xs">{req.leaveType}</Badge>
                                            <LeaveStatusBadge status={req.status} />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {formatDate(req.startDate)} – {formatDate(req.endDate)} ({req.totalDays} day{req.totalDays !== 1 ? 's' : ''})
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

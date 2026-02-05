'use client';
import { useQuery } from '@tanstack/react-query';
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import WidgetContainer from "./WidgetContainer";

const fetchRecentPayments = async ({ schoolId, academicYearId }) => {
    if (!schoolId || !academicYearId) return null;
    const params = new URLSearchParams({ schoolId, academicYearId });
    const res = await fetch(`/api/schools/fee/admin/dashboard?${params}`);
    if (!res.ok) throw new Error('Failed to fetch payments');
    const data = await res.json();
    return data.recentPayments || [];
};

export default function RecentPaymentsWidget({ fullUser, onRemove, recentPayments: propData }) {
    // 1. Fetch active academic year first (like FeeStatsWidget does)
    const { data: academicYears } = useQuery({
        queryKey: ['academic-years', fullUser?.schoolId],
        queryFn: async () => {
            if (!fullUser?.schoolId) return [];
            const res = await fetch(`/api/schools/academic-years?schoolId=${fullUser.schoolId}`);
            if (!res.ok) throw new Error('Failed to fetch academic years');
            return res.json();
        },
        enabled: !!fullUser?.schoolId && !propData,
    });

    const activeAcademicYearId = academicYears?.find(y => y.isActive)?.id;

    // 2. Fetch payments using the active academic year (only if prop data not provided)
    const { data: fetchedPayments, isLoading: fetchLoading, error } = useQuery({
        queryKey: ['recentPayments', fullUser?.schoolId, activeAcademicYearId],
        queryFn: () => fetchRecentPayments({
            schoolId: fullUser?.schoolId,
            academicYearId: activeAcademicYearId
        }),
        enabled: !!fullUser?.schoolId && !!activeAcademicYearId && !propData,
    });

    const payments = propData || fetchedPayments;
    const isLoading = !propData && fetchLoading;

    if (isLoading) {
        return (
            <WidgetContainer title="Recent Payments" onRemove={onRemove} className="col-span-1 md:col-span-2">
                <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            </WidgetContainer>
        );
    }

    return (
        <WidgetContainer title="Recent Payments" onRemove={onRemove} className="col-span-1 md:col-span-2">
            <div className="relative overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {payments && payments.length > 0 ? (
                            payments.map((payment) => {
                                const studentName = payment.student?.name || payment.student?.admissionNo || 'Unknown';
                                const isSuccess = payment.status === 'SUCCESS';
                                const isFailed = payment.status === 'FAILED';

                                return (
                                    <TableRow key={payment.id}>
                                        <TableCell className="font-medium">
                                            {studentName}
                                            {payment.student?.name && (
                                                <div className="text-xs text-muted-foreground">{payment.student?.admissionNo}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>{payment.student?.class?.className}</TableCell>
                                        <TableCell className="font-semibold">₹{payment.amount?.toLocaleString('en-IN')}</TableCell>
                                        <TableCell className="text-muted-foreground">{format(new Date(payment.paymentDate), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${isSuccess
                                                ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                                : isFailed
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-yellow-500'
                                                    }`}></span>
                                                {payment.status}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                    No recent payments found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </WidgetContainer>
    );
}

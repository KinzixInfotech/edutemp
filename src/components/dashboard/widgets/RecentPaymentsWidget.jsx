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

export default function RecentPaymentsWidget({ fullUser, onRemove }) {
    const { data: payments, isLoading } = useQuery({
        queryKey: ['recentPayments', fullUser?.schoolId, fullUser?.academicYearId],
        queryFn: () => fetchRecentPayments({
            schoolId: fullUser?.schoolId,
            academicYearId: fullUser?.academicYear?.id
        }),
        enabled: !!fullUser?.schoolId && !!fullUser?.academicYear?.id,
    });

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
                            payments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell className="font-medium">
                                        {payment.student?.name}
                                        <div className="text-xs text-muted-foreground">{payment.student?.admissionNo}</div>
                                    </TableCell>
                                    <TableCell>{payment.student?.class?.className}</TableCell>
                                    <TableCell>₹{payment.amount.toLocaleString('en-IN')}</TableCell>
                                    <TableCell>{format(new Date(payment.paymentDate), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell>
                                        <Badge variant={payment.status === 'SUCCESS' ? 'default' : 'destructive'} className="text-[10px]">
                                            {payment.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
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

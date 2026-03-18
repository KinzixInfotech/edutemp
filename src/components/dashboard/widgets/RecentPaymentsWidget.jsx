'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WidgetContainer from "./WidgetContainer";
import Link from "next/link";
import {
    MoreVertical,
    Eye,
    Download,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 6;

const fetchRecentPayments = async ({ schoolId, academicYearId }) => {
    if (!schoolId || !academicYearId) return null;
    const params = new URLSearchParams({ schoolId, academicYearId });
    const res = await fetch(`/api/schools/fee/admin/dashboard?${params}`);
    if (!res.ok) throw new Error('Failed to fetch payments');
    const data = await res.json();
    return data.recentPayments || [];
};

export default function RecentPaymentsWidget({ fullUser, onRemove, recentPayments: propData }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [generatingReceiptId, setGeneratingReceiptId] = useState(null);

    const schoolId = fullUser?.schoolId;

    // 1. Fetch active academic year first
    const { data: academicYears } = useQuery({
        queryKey: ['academic-years', schoolId],
        queryFn: async () => {
            if (!schoolId) return [];
            const res = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed to fetch academic years');
            return res.json();
        },
        enabled: !!schoolId && !propData,
    });

    const activeAcademicYearId = academicYears?.find(y => y.isActive)?.id;

    // 2. Fetch payments using the active academic year (only if prop data not provided)
    const { data: fetchedPayments, isLoading: fetchLoading } = useQuery({
        queryKey: ['recentPayments', schoolId, activeAcademicYearId],
        queryFn: () => fetchRecentPayments({
            schoolId,
            academicYearId: activeAcademicYearId
        }),
        enabled: !!schoolId && !!activeAcademicYearId && !propData,
    });

    const allPayments = propData || fetchedPayments || [];
    const isLoading = !propData && fetchLoading;

    // Pagination — no date filter, show all recent payments
    const totalPages = Math.ceil(allPayments.length / PAGE_SIZE);
    const paginatedPayments = allPayments.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    // Receipt download handler — uses CDN URL directly
    const handleReceiptAction = (payment) => {
        if (payment.receiptUrl) {
            window.open(payment.receiptUrl, '_blank');
        } else {
            toast.error('Receipt not available for this payment');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    if (isLoading) {
        return (
            <WidgetContainer title="Recent Payments" onRemove={onRemove} className="h-full">
                <div className="space-y-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </div>
            </WidgetContainer>
        );
    }

    return (
        <WidgetContainer
            title="Recent Payments"
            subtitle={`${allPayments.length} transaction${allPayments.length !== 1 ? 's' : ''}`}
            onRemove={onRemove}
            className="h-full"
        >
            <div className="relative overflow-x-auto flex-1 -mt-1 flex flex-col">
                <Table className="flex-1">
                    <TableHeader>
                        <TableRow className="bg-muted/50 dark:bg-background/50">
                            <TableHead className="w-[30px] text-xs py-3.5">#</TableHead>
                            <TableHead className="text-xs py-3.5">Receipt No</TableHead>
                            <TableHead className="text-xs py-3.5">Student</TableHead>
                            <TableHead className="text-xs py-3.5">Class</TableHead>
                            <TableHead className="text-xs py-3.5">Date</TableHead>
                            <TableHead className="text-xs py-3.5">Method</TableHead>
                            <TableHead className="text-xs py-3.5">Mode</TableHead>
                            <TableHead className="text-xs py-3.5">Status</TableHead>
                            <TableHead className="text-xs py-3.5">Amount</TableHead>
                            <TableHead className="text-xs py-3.5 min-w-[110px]">Progress</TableHead>
                            <TableHead className="text-xs py-3.5 text-right w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedPayments.length > 0 ? (
                            paginatedPayments.map((payment, index) => {
                                const studentName = payment.student?.name || 'Unknown';
                                const admissionNo = payment.student?.admissionNo || '';
                                const className = payment.student?.class?.className || '-';
                                const sectionName = payment.student?.section?.name;
                                const classSection = sectionName ? `${className} - ${sectionName}` : className;
                                const receiptNo = payment.receiptNumber || '-';

                                // Progress bar data
                                const totalFee = payment.studentFee?.finalAmount || 0;
                                const paidAmount = payment.studentFee?.paidAmount || 0;
                                const paidPercentage = totalFee > 0 ? Math.round((paidAmount / totalFee) * 100) : 0;

                                const isSuccess = payment.status === 'SUCCESS';
                                const isFailed = payment.status === 'FAILED';
                                const rowNum = (currentPage - 1) * PAGE_SIZE + index + 1;

                                return (
                                    <TableRow
                                        key={payment.id}
                                        className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? 'bg-muted/10 dark:bg-background/10' : ''}`}
                                    >
                                        <TableCell className="text-xs text-muted-foreground py-3.5">{rowNum}</TableCell>
                                        <TableCell className="text-xs font-mono text-muted-foreground max-w-[140px] truncate py-3.5" title={receiptNo}>
                                            {receiptNo}
                                        </TableCell>
                                        <TableCell className="py-3.5">
                                            <div>
                                                <div className="text-xs font-medium leading-tight">{studentName}</div>
                                                {admissionNo && (
                                                    <div className="text-[10px] text-muted-foreground leading-tight">{admissionNo}</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs py-3.5">{classSection}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3.5">
                                            {format(new Date(payment.paymentDate), 'dd MMM yyyy')}
                                        </TableCell>
                                        <TableCell className="text-xs py-3.5">
                                            <span className="text-muted-foreground">{payment.paymentMethod?.replace(/_/g, ' ') || '-'}</span>
                                        </TableCell>
                                        <TableCell className="text-xs py-3.5">
                                            <span className="text-muted-foreground">{payment.paymentMode || '-'}</span>
                                        </TableCell>
                                        <TableCell className="py-3.5">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isSuccess
                                                ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                                : isFailed
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                                                {payment.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-semibold text-xs whitespace-nowrap py-3.5">
                                            {formatCurrency(payment.amount)}
                                        </TableCell>
                                        <TableCell className="py-3.5">
                                            {totalFee > 0 ? (
                                                <div className="space-y-0.5 min-w-[90px]">
                                                    <div className="flex items-center justify-between text-[10px]">
                                                        <span className="text-green-600 dark:text-green-400 font-semibold">{paidPercentage}%</span>
                                                        <span className="text-muted-foreground">{formatCurrency(totalFee)}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${paidPercentage >= 100
                                                                ? 'bg-green-500'
                                                                : paidPercentage >= 50
                                                                    ? 'bg-amber-500'
                                                                    : 'bg-orange-500'
                                                                }`}
                                                            style={{ width: `${Math.min(paidPercentage, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right py-3.5">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                                        <MoreVertical className="h-3.5 w-3.5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/fees/students/${payment.studentId || payment.student?.userId}`} className="flex items-center gap-2">
                                                            <Eye className="h-3.5 w-3.5" />
                                                            View
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    {payment.receiptUrl ? (
                                                        <DropdownMenuItem
                                                            onClick={() => handleReceiptAction(payment)}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                            View Receipt
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            disabled
                                                            className="flex items-center gap-2 text-muted-foreground"
                                                        >
                                                            <Download className="h-3.5 w-3.5" />
                                                            No Receipt
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center text-muted-foreground h-20 text-xs">
                                    No recent payments
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 mt-auto border-t">
                    <p className="text-xs text-muted-foreground">
                        {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, allPayments.length)} of {allPayments.length}
                    </p>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-6 w-6 p-0"
                        >
                            <ChevronLeft className="w-3 h-3" />
                        </Button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }
                            return (
                                <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className="h-6 w-6 p-0 text-xs"
                                >
                                    {pageNum}
                                </Button>
                            );
                        })}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="h-6 w-6 p-0"
                        >
                            <ChevronRight className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
            )}
        </WidgetContainer>
    );
}

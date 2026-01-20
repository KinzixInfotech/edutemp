'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

export default function AdminFeeDashboard() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;

  const [selectedClass, setSelectedClass] = useState('all');

  // Pagination state for Recent Payments
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const ITEMS_PER_PAGE = 10;

  // Fetch active academic year
  const { data: academicYears } = useQuery({
    queryKey: ['academic-years', schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!schoolId,
  });
  const activeAcademicYear = academicYears?.find(y => y.isActive);
  const academicYearId = activeAcademicYear?.id;

  // Format dates for date input min/max
  const academicYearMinDate = activeAcademicYear?.startDate
    ? new Date(activeAcademicYear.startDate).toISOString().split('T')[0]
    : '';
  const academicYearMaxDate = activeAcademicYear?.endDate
    ? new Date(activeAcademicYear.endDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  // Fetch dashboard stats
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['fee-dashboard', schoolId, academicYearId, selectedClass],
    queryFn: async () => {
      const params = new URLSearchParams({
        schoolId,
        academicYearId,
        ...(selectedClass !== 'all' && { classId: selectedClass }),
      });

      const res = await fetch(`/api/schools/fee/admin/dashboard?${params}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!schoolId && !!academicYearId,
    staleTime: 1000 * 60 * 2,
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { summary, statusCounts, recentPayments, overdueStudents, classWiseStats, paymentMethodStats } = dashboardData || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            Fee Collection Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time fee collection overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <label className="block text-sm font-medium mb-2">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Link href="/dashboard/fees/manage-fee-structure">
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Structures
              </Button>
            </Link>
            <Link href="/dashboard/fees/payments">
              <Button variant="outline">
                <CreditCard className="w-4 h-4 mr-2" />
                Payments
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
              <span className="text-2xl font-bold">{summary?.collectionPercentage}%</span>
            </div>
            <h3 className="text-sm font-medium opacity-90">Total Fees Expected</h3>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.totalExpected)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-medium opacity-90">Total Fees Collected</h3>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.totalCollected)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 opacity-80" />
              <span className="text-sm bg-white/20 px-2 py-1 rounded">
                {statusCounts?.overdue || 0} Students
              </span>
            </div>
            <h3 className="text-sm font-medium opacity-90">Total Fees Due</h3>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.totalBalance)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 opacity-80" />
              <span className="text-sm bg-white/20 px-2 py-1 rounded">
                {statusCounts?.total || 0} Total
              </span>
            </div>
            <h3 className="text-sm font-medium opacity-90">Discount Given</h3>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.totalDiscount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts?.paid || 0}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Partial</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts?.partial || 0}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unpaid</p>
                <p className="text-2xl font-bold text-blue-600">{statusCounts?.unpaid || 0}</p>
              </div>
              <XCircle className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts?.overdue || 0}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Payments</TabsTrigger>
          <TabsTrigger value="overdue">Overdue Students</TabsTrigger>
          <TabsTrigger value="classwise">Class-wise Stats</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>All payment transactions for this academic year</CardDescription>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      placeholder="From"
                      className="w-36"
                      value={dateFilter.start}
                      min={academicYearMinDate}
                      max={dateFilter.end || academicYearMaxDate}
                      onChange={(e) => { setDateFilter(prev => ({ ...prev, start: e.target.value })); setCurrentPage(1); }}
                    />
                    <Input
                      type="date"
                      placeholder="To"
                      className="w-36"
                      value={dateFilter.end}
                      min={dateFilter.start || academicYearMinDate}
                      max={academicYearMaxDate}
                      onChange={(e) => { setDateFilter(prev => ({ ...prev, end: e.target.value })); setCurrentPage(1); }}
                    />
                  </div>
                  <div className="relative w-48">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search student..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Filter payments
                const filtered = (recentPayments || []).filter(payment => {
                  const matchesSearch = !searchQuery ||
                    payment.student?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    payment.receiptNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    payment.student?.admissionNo?.toLowerCase().includes(searchQuery.toLowerCase());

                  const paymentDate = new Date(payment.paymentDate);
                  const matchesDateStart = !dateFilter.start || paymentDate >= new Date(dateFilter.start);
                  const matchesDateEnd = !dateFilter.end || paymentDate <= new Date(dateFilter.end + 'T23:59:59');

                  return matchesSearch && matchesDateStart && matchesDateEnd;
                });

                const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
                const paginatedPayments = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                return (
                  <>
                    <div className="overflow-x-auto rounded-md border">
                      <Table className="min-w-[900px]">
                        <TableHeader className="bg-muted sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Receipt No</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Mode</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="w-24">Receipt</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedPayments.length > 0 ? (
                            paginatedPayments.map((payment, idx) => (
                              <TableRow key={payment.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                                <TableCell className="text-muted-foreground">
                                  {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                                </TableCell>
                                <TableCell className="font-mono text-sm">{payment.receiptNumber}</TableCell>
                                <TableCell>
                                  <div>
                                    <span className="font-medium">{payment.student?.name || 'N/A'}</span>
                                    <p className="text-xs text-muted-foreground">{payment.student?.admissionNo}</p>
                                  </div>
                                </TableCell>
                                <TableCell>{payment.student?.class?.className || '-'}</TableCell>
                                <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">{payment.paymentMethod}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">{payment.paymentMode}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={`text-xs ${payment.status === 'SUCCESS'
                                      ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                      : payment.status === 'FAILED'
                                        ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                                      }`}
                                  >
                                    {payment.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                                <TableCell>
                                  {payment.receiptUrl ? (
                                    <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                                      <Button variant="ghost" size="sm">
                                        <ExternalLink className="w-4 h-4 mr-1" />
                                        View
                                      </Button>
                                    </a>
                                  ) : (
                                    <Button variant="ghost" size="sm" disabled>
                                      <Download className="w-4 h-4 mr-1" />
                                      N/A
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                                No payments found matching your criteria.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} payments
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm px-2">
                            Page {currentPage} of {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Students</CardTitle>
              <CardDescription>{overdueStudents?.length || 0} students with pending payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overdueStudents?.map((student) => (
                  <div key={student.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{student.name}</span>
                        <Badge variant="destructive" className="text-xs">
                          {student.overdueInstallments?.length || 0} Overdue
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {student.admissionNo} • {student.class?.className}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-red-600">{formatCurrency(student.balanceAmount)}</p>
                      <Link href={`/dashboard/fee/students/${student.userId}`}>
                        <Button variant="outline" size="sm" className="mt-1">
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classwise">
          <Card>
            <CardHeader>
              <CardTitle>Class-wise Collection</CardTitle>
              <CardDescription>Fee collection breakdown by class</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {classWiseStats?.map((stat) => (
                  <div key={stat.classId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{stat.className}</h3>
                      <Badge>{stat.count} Students</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Expected</p>
                        <p className="font-semibold">{formatCurrency(stat.expected)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Collected</p>
                        <p className="font-semibold text-green-600">{formatCurrency(stat.collected)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fees Due</p>
                        <p className="font-semibold text-red-600">{formatCurrency(stat.balance)}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(stat.collected / stat.expected) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Distribution by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paymentMethodStats?.map((method) => (
                  <div key={method.paymentMethod} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{method.paymentMethod}</p>
                        <p className="text-sm text-muted-foreground">{method._count} transactions</p>
                      </div>
                    </div>
                    <p className="font-bold text-lg">{formatCurrency(method._sum.amount)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
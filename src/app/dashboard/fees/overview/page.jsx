'use client';
import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
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
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Percent
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';

const STORAGE_KEY = 'fee-overview-chart-range';
const CLASS_ITEMS_PER_PAGE = 5;
const OVERDUE_ITEMS_PER_PAGE = 10;

export default function AdminFeeDashboard() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;

  const [selectedClass, setSelectedClass] = useState('all');

  // Pagination state for Recent Payments
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const ITEMS_PER_PAGE = 10;

  // Persist chart range in localStorage
  const [feeChartRange, setFeeChartRange] = useState('all');
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ['3m', '6m', '1y', 'all'].includes(saved)) {
      setFeeChartRange(saved);
    }
  }, []);
  const handleChartRangeChange = (val) => {
    setFeeChartRange(val);
    localStorage.setItem(STORAGE_KEY, val);
  };

  // Overdue tab pagination + search
  const [overdueSearch, setOverdueSearch] = useState('');
  const [overdueCurrentPage, setOverdueCurrentPage] = useState(1);
  const [expandedClasses, setExpandedClasses] = useState({});

  // Class-wise stats pagination
  const [classStatsPage, setClassStatsPage] = useState(1);

  // Fetch active academic year
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
  const activeAcademicYear = academicYears?.find(y => y.isActive);
  const [selectedYearId, setSelectedYearId] = useState(null);
  const academicYearId = selectedYearId || activeAcademicYear?.id;
  const selectedYearName = academicYears?.find(y => y.id === academicYearId)?.name;

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
      const res = await fetch(`/api/schools/${schoolId}/classes?limit=-1`);
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      return Array.isArray(json) ? json : (json.data ?? []);
    },
    enabled: !!schoolId,
    staleTime: 1000 * 60 * 5,
  });

  // Destructure BEFORE any early return to keep hooks order stable
  const { summary, statusCounts, recentPayments, overdueStudents, classWiseStats, paymentMethodStats, monthlyCollection } = dashboardData || {};

  // Compute effective outstanding = totalBalance - totalDiscount
  // But the DB `balanceAmount` already reflects discounts so totalBalance is the real outstanding.
  // The discount card shows how much was given away.
  // The "Fees Due" shows the real remaining amount (already net of discount).

  // Prepare class-wise chart data
  const classChartData = useMemo(() => {
    if (!classWiseStats) return [];
    return classWiseStats.map(s => ({
      name: s.className?.length > 10 ? s.className.slice(0, 10) + '…' : s.className,
      fullName: s.className,
      collected: s.collected || 0,
      due: s.balance || 0,
    }));
  }, [classWiseStats]);

  // Paginate class-wise stats
  const paginatedClassStats = useMemo(() => {
    if (!classWiseStats) return { items: [], totalPages: 0 };
    const totalPages = Math.ceil(classWiseStats.length / CLASS_ITEMS_PER_PAGE);
    const items = classWiseStats.slice(
      (classStatsPage - 1) * CLASS_ITEMS_PER_PAGE,
      classStatsPage * CLASS_ITEMS_PER_PAGE
    );
    return { items, totalPages, total: classWiseStats.length };
  }, [classWiseStats, classStatsPage]);

  // Group overdue students by class then section
  const groupedOverdueStudents = useMemo(() => {
    if (!overdueStudents) return [];

    let filtered = overdueStudents;
    if (overdueSearch) {
      const term = overdueSearch.toLowerCase();
      filtered = overdueStudents.filter(s =>
        s.name?.toLowerCase().includes(term) ||
        s.admissionNo?.toLowerCase().includes(term) ||
        s.class?.className?.toLowerCase().includes(term)
      );
    }

    // Group by class -> section
    const groups = {};
    filtered.forEach(student => {
      const className = student.class?.className || 'Unassigned';
      const sectionName = student.section?.name || 'No Section';
      const key = `${className} - ${sectionName}`;
      if (!groups[key]) {
        groups[key] = {
          className,
          sectionName,
          key,
          students: [],
          totalOverdue: 0,
        };
      }
      groups[key].students.push(student);
      groups[key].totalOverdue += student.balanceAmount || 0;
    });

    return Object.values(groups).sort((a, b) => a.className.localeCompare(b.className));
  }, [overdueStudents, overdueSearch]);

  // Paginate grouped overdue (page across groups)
  const paginatedOverdueGroups = useMemo(() => {
    // Flatten all students across groups for pagination
    const allStudents = groupedOverdueStudents.flatMap(g => g.students);
    const totalPages = Math.ceil(allStudents.length / OVERDUE_ITEMS_PER_PAGE);
    return { groups: groupedOverdueStudents, totalPages, total: allStudents.length };
  }, [groupedOverdueStudents]);

  // Prepare monthly collection chart data (filtered by range)
  const monthlyChartData = useMemo(() => {
    if (!monthlyCollection || monthlyCollection.length === 0) return [];
    const sorted = [...monthlyCollection].sort((a, b) => new Date(a.month) - new Date(b.month));

    // Filter based on selected range
    let filtered = sorted;
    if (feeChartRange !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      switch (feeChartRange) {
        case '3m': cutoff.setMonth(now.getMonth() - 3); break;
        case '6m': cutoff.setMonth(now.getMonth() - 6); break;
        case '1y': cutoff.setFullYear(now.getFullYear() - 1); break;
      }
      filtered = sorted.filter(m => new Date(m.month) >= cutoff);
    }

    return filtered.map(m => ({
      month: new Date(m.month).toLocaleString('default', { month: 'short', year: '2-digit' }),
      fullMonth: new Date(m.month).toLocaleString('default', { month: 'long', year: 'numeric' }),
      amount: Number(m.total) || 0,
      count: Number(m.count) || 0,
    }));
  }, [monthlyCollection, feeChartRange]);

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

  // Fee chart tooltip
  const FeeTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-1">{data?.fullMonth || data?.fullName || label}</p>
        {payload.map((p) => (
          <p key={p.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}: <span className="font-semibold">₹{(p.value || 0).toLocaleString('en-IN')}</span>
          </p>
        ))}
        {data?.count != null && (
          <p className="text-muted-foreground mt-1">{data.count} transaction{data.count !== 1 ? 's' : ''}</p>
        )}
      </div>
    );
  };

  const toggleClassExpand = (key) => {
    setExpandedClasses(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
              <label className="block text-sm font-medium mb-2">Academic Year</label>
              <Select value={academicYearId || ''} onValueChange={(v) => setSelectedYearId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears?.map((yr) => (
                    <SelectItem key={yr.id} value={yr.id}>
                      {yr.name} {yr.isActive ? '(Active)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

      {/* Stats Cards + Collection Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Stats Cards in 2x4 grid */}
        <div className="lg:col-span-1 grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expected</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary?.totalExpected)}</div>
              <p className="text-xs text-muted-foreground">{summary?.collectionPercentage}% collected</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collected</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.totalCollected)}</div>
              <p className="text-xs text-muted-foreground">{statusCounts?.paid || 0} fully paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency((summary?.totalBalance || 0) - (summary?.totalDiscount || 0))}
              </div>
              <p className="text-xs text-muted-foreground">Net of ₹{((summary?.totalDiscount || 0) / 1000).toFixed(0)}k discount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Discount</CardTitle>
              <Percent className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(summary?.totalDiscount)}</div>
              <p className="text-xs text-muted-foreground">{statusCounts?.total || 0} students</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Collection Trend Line Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Collection Trend</CardTitle>
                <CardDescription>
                  {{ '3m': 'Last 3 months', '6m': 'Last 6 months', '1y': 'Last 1 year', 'all': 'Full academic year' }[feeChartRange]}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={feeChartRange} onValueChange={handleChartRangeChange}>
                  <SelectTrigger className="w-[150px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3m">Last 3 Months</SelectItem>
                    <SelectItem value="6m">Last 6 Months</SelectItem>
                    <SelectItem value="1y">Last 1 Year</SelectItem>
                    <SelectItem value="all">Full Year</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(221, 83%, 53%)' }} /> Collected</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              {monthlyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<FeeTooltip />} />
                    <Area type="monotone" dataKey="amount" name="Collected" stroke="#3b82f6" strokeWidth={2.5} fill="url(#feeGradient)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No collection data for this range</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown + Class-wise Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Status Cards */}
        <div className="lg:col-span-1 grid grid-cols-2 gap-4">
          <Card className="border-l-4 border-green-500">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts?.paid || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-yellow-500">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Partial</p>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts?.partial || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-blue-500">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Unpaid</p>
              <p className="text-2xl font-bold text-blue-600">{statusCounts?.unpaid || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-red-500">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{statusCounts?.overdue || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Class-wise Collection Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Class-wise Collection</CardTitle>
                <CardDescription>Collected vs Due by class</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Collected</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Due</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              {classChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<FeeTooltip />} />
                    <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="due" name="Due" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No class data</div>
              )}
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
                    <div className="overflow-x-auto rounded-lg border">
                      <Table className="min-w-[900px]">
                        <TableHeader>
                          <TableRow className="bg-muted/50 dark:bg-background/50">
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
                              <TableRow key={payment.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
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

        {/* OVERDUE STUDENTS - Grouped by Class & Section */}
        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Overdue Students</CardTitle>
                  <CardDescription>{paginatedOverdueGroups.total || 0} students with pending payments</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, admission no, class..."
                    className="pl-8"
                    value={overdueSearch}
                    onChange={(e) => { setOverdueSearch(e.target.value); setOverdueCurrentPage(1); }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {groupedOverdueStudents.length > 0 ? (
                <div className="space-y-3">
                  {groupedOverdueStudents.map((group) => (
                    <div key={group.key} className="border rounded-lg overflow-hidden">
                      {/* Group Header */}
                      <button
                        onClick={() => toggleClassExpand(group.key)}
                        className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-semibold text-sm">
                            {group.className} - {group.sectionName}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {group.students.length} student{group.students.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-red-600">
                            {formatCurrency(group.totalOverdue)}
                          </span>
                          {expandedClasses[group.key] ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Students */}
                      {(expandedClasses[group.key] ?? true) && (
                        <div className="divide-y">
                          {group.students.map((student) => (
                            <div key={student.userId} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{student.name}</span>
                                  <Badge variant="destructive" className="text-xs">
                                    {student.overdueInstallments?.length || 0} Overdue
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {student.admissionNo}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg text-red-600">{formatCurrency(student.balanceAmount)}</p>
                                <Link href={`/dashboard/fees/students/${student.userId}`}>
                                  <Button variant="outline" size="sm" className="mt-1">
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No overdue students found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLASS-WISE STATS with Pagination */}
        <TabsContent value="classwise">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Class-wise Collection</CardTitle>
                  <CardDescription>Fee collection breakdown by class ({classWiseStats?.length || 0} classes)</CardDescription>
                </div>
                {paginatedClassStats.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setClassStatsPage(p => Math.max(1, p - 1))}
                      disabled={classStatsPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {classStatsPage} / {paginatedClassStats.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setClassStatsPage(p => Math.min(paginatedClassStats.totalPages, p + 1))}
                      disabled={classStatsPage === paginatedClassStats.totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedClassStats.items.map((stat) => {
                  const percentage = stat.expected > 0 ? ((stat.collected / stat.expected) * 100) : 0;
                  return (
                    <div key={stat.classId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{stat.className}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{stat.count} Students</Badge>
                          <Badge className={
                            percentage >= 80 ? 'bg-green-100 text-green-700' :
                              percentage >= 50 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                          }>
                            {percentage.toFixed(0)}%
                          </Badge>
                        </div>
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
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${percentage >= 80 ? 'bg-green-600' :
                              percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
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
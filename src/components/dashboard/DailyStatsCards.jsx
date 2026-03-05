'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, IndianRupee, TrendingUp, UsersRound, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ───── Chart Colors ─────
const COLORS = {
    present: 'hsl(142, 71%, 45%)',
    absent: 'hsl(0, 84%, 60%)',
    late: 'hsl(38, 92%, 50%)',
    collected: 'hsl(142, 71%, 45%)',
    outstanding: 'hsl(0, 84%, 60%)',
    discount: 'hsl(38, 92%, 50%)',
    fee: 'hsl(262, 83%, 58%)',
};

const RANGE_OPTIONS = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '2m', label: 'Last 2 Months' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '1y', label: 'Last 1 Year' },
];

// ───── Custom Tooltips ─────
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
            <p className="font-medium text-foreground mb-1">{label}</p>
            {payload.map((p) => (
                <p key={p.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                    {p.name}: <span className="font-semibold">{typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}</span>
                </p>
            ))}
        </div>
    );
}

function FeeTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
            <p className="font-medium text-foreground mb-1">{label}</p>
            {payload.map((p) => (
                <p key={p.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                    {p.name}: <span className="font-semibold">₹{typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}</span>
                </p>
            ))}
        </div>
    );
}

function PieTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
            <p className="font-medium text-foreground">{d.name}</p>
            <p style={{ color: d.payload.fill }}>
                {typeof d.value === 'number' ? (d.name === 'Collected' || d.name === 'Outstanding' || d.name === 'Discount' ? `₹${d.value.toLocaleString('en-IN')}` : d.value.toLocaleString('en-IN')) : d.value} ({d.payload.percentage}%)
            </p>
        </div>
    );
}

function BarTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
            <p className="font-medium text-foreground mb-1">{label}</p>
            {payload.map((p) => (
                <p key={p.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.fill || p.color }} />
                    <span className="font-semibold">{p.value}</span> students
                </p>
            ))}
        </div>
    );
}

// ───── Progress Bar ─────
function ProgressBar({ value, max, color }) {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
            <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}

// ───── Fetch helpers ─────
const fetchDailyStats = async ({ schoolId, academicYearId }) => {
    if (!schoolId) return null;
    const params = new URLSearchParams({ schoolId });
    if (academicYearId) params.append('academicYearId', academicYearId);
    const res = await fetch(`/api/dashboard/daily-stats?${params}`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
};

const fetchChartData = async ({ schoolId, academicYearId, range }) => {
    if (!schoolId) return null;
    const params = new URLSearchParams({ schoolId, range });
    if (academicYearId) params.append('academicYearId', academicYearId);
    const res = await fetch(`/api/dashboard/charts?${params}`);
    if (!res.ok) throw new Error('Failed to fetch chart data');
    return res.json();
};


export default function DailyStatsCards({ schoolId, academicYearId, data: propData }) {
    const [attendanceRange, setAttendanceRange] = useState('30d');
    const [feeRange, setFeeRange] = useState('30d');

    // ── Stats data (existing) ──
    const { data: fetchedData, isLoading: fetchLoading } = useQuery({
        queryKey: ['daily-stats', schoolId, academicYearId],
        queryFn: () => fetchDailyStats({ schoolId, academicYearId }),
        enabled: !!schoolId && !propData,
        refetchInterval: 60000,
    });
    const data = propData || fetchedData;
    const isLoading = !propData && fetchLoading;

    // ── Chart data (new) ──
    const { data: attendanceChartData, isLoading: attendanceChartLoading } = useQuery({
        queryKey: ['dashboard-charts-attendance', schoolId, academicYearId, attendanceRange],
        queryFn: () => fetchChartData({ schoolId, academicYearId, range: attendanceRange }),
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    const { data: feeChartData, isLoading: feeChartLoading } = useQuery({
        queryKey: ['dashboard-charts-fee', schoolId, academicYearId, feeRange],
        queryFn: () => fetchChartData({ schoolId, academicYearId, range: feeRange }),
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    // ── Format chart data ──
    const isMonthly = (r) => r === '6m' || r === '1y';

    const attendanceTrend = useMemo(() => {
        if (!attendanceChartData?.attendanceTrend?.length) return [];
        return attendanceChartData.attendanceTrend.map(d => {
            const date = new Date(d.period);
            const label = isMonthly(attendanceRange)
                ? date.toLocaleString('default', { month: 'short', year: '2-digit' })
                : `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
            return { date: label, present: d.present, absent: d.absent, late: d.late };
        });
    }, [attendanceChartData, attendanceRange]);

    const feeTrend = useMemo(() => {
        if (!feeChartData?.feeCollectionTrend?.length) return [];
        return feeChartData.feeCollectionTrend.map(d => {
            const date = new Date(d.period);
            const label = isMonthly(feeRange)
                ? date.toLocaleString('default', { month: 'short', year: '2-digit' })
                : `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
            return { date: label, amount: Number(d.amount) || 0, count: d.count };
        });
    }, [feeChartData, feeRange]);

    const attendanceBar = attendanceChartData?.attendanceBar || [];
    const feePie = feeChartData?.feePie || [];

    // ── Summary stats ──
    const stats = [
        {
            title: 'Students Present',
            value: data?.studentsPresent ?? 0,
            total: data?.totalStudents ?? 0,
            subtitle: `out of ${data?.totalStudents ?? 0} enrolled`,
            icon: Users,
            iconBg: 'bg-blue-100 dark:bg-blue-900/40',
            iconColor: 'text-blue-600 dark:text-blue-400',
            progressColor: 'bg-blue-500',
        },
        {
            title: 'Staff Attendance',
            value: `${(data?.teachingStaffPresent ?? 0) + (data?.nonTeachingStaffPresent ?? 0)}/${(data?.totalTeachingStaff ?? 0) + (data?.totalNonTeachingStaff ?? 0)}`,
            rawValue: (data?.teachingStaffPresent ?? 0) + (data?.nonTeachingStaffPresent ?? 0),
            total: (data?.totalTeachingStaff ?? 0) + (data?.totalNonTeachingStaff ?? 0),
            subtitle: 'Teaching & Non-teaching',
            icon: UserCheck,
            iconBg: 'bg-green-100 dark:bg-green-900/40',
            iconColor: 'text-green-600 dark:text-green-400',
            progressColor: 'bg-green-500',
        },
        {
            title: 'Collections Today',
            value: `₹${(data?.paymentsToday?.amount || 0).toLocaleString('en-IN')}`,
            rawValue: data?.paymentsToday?.amount || 0,
            total: data?.dailyTarget || 50000,
            subtitle: `${data?.paymentsToday?.count || 0} transactions processed`,
            icon: IndianRupee,
            iconBg: 'bg-purple-100 dark:bg-purple-900/40',
            iconColor: 'text-purple-600 dark:text-purple-400',
            progressColor: 'bg-purple-500',
        },
        {
            title: 'Outstanding Fees',
            value: `₹${(data?.outstandingFees || 0).toLocaleString('en-IN')}`,
            rawValue: data?.outstandingFees || 0,
            total: data?.totalFees || 100000,
            subtitle: `Across ${data?.studentsWithDues || 0} students`,
            icon: TrendingUp,
            iconBg: 'bg-orange-100 dark:bg-orange-900/40',
            iconColor: 'text-orange-600 dark:text-orange-400',
            progressColor: 'bg-orange-500',
        }
    ];

    if (isLoading) {
        return (
            <div className="mb-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="p-5 rounded-xl border bg-white dark:bg-[#1a1a1d] border-gray-100 dark:border-gray-800">
                            <div className="flex items-start justify-between mb-4">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                            </div>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-1.5 w-full rounded-full" />
                            <Skeleton className="h-3 w-32 mt-3" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 p-6 rounded-xl border bg-white dark:bg-[#1a1a1d]">
                        <Skeleton className="h-[250px] w-full rounded-lg" />
                    </div>
                    <div className="p-6 rounded-xl border bg-white dark:bg-[#1a1a1d]">
                        <Skeleton className="h-[250px] w-full rounded-lg" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-6 space-y-4">
            {/* ═══ Summary Metric Cards ═══ */}
            <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    KEY METRICS
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        const progressValue = stat.rawValue !== undefined ? stat.rawValue : stat.value;
                        return (
                            <div
                                key={index}
                                className="group border relative p-5 rounded-xl bg-white dark:bg-[#1a1a1d] hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-2.5 rounded-lg ${stat.iconBg}`}>
                                        <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
                                    {stat.title}
                                </p>
                                <h3 className="text-2xl font-bold text-foreground tracking-tight">
                                    {stat.value}
                                </h3>
                                <ProgressBar
                                    value={typeof progressValue === 'number' ? progressValue : stat.value}
                                    max={stat.total}
                                    color={stat.progressColor}
                                />
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                                    {stat.subtitle}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ Attendance Charts Row ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Attendance Area Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Attendance Trend</CardTitle>
                                <CardDescription>
                                    {RANGE_OPTIONS.find(r => r.value === attendanceRange)?.label}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                <Select value={attendanceRange} onValueChange={setAttendanceRange}>
                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {RANGE_OPTIONS.map(o => (
                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="hidden sm:flex items-center gap-3 text-xs">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.present }} /> Present</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.absent }} /> Absent</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.late }} /> Late</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            {attendanceChartLoading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Skeleton className="h-full w-full rounded-lg" />
                                </div>
                            ) : attendanceTrend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={attendanceTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={COLORS.present} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={COLORS.present} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={COLORS.absent} stopOpacity={0.2} />
                                                <stop offset="95%" stopColor={COLORS.absent} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" className="text-muted-foreground" />
                                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                                        <Tooltip content={<ChartTooltip />} />
                                        <Area type="monotone" dataKey="present" name="Present" stroke={COLORS.present} fill="url(#gradPresent)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="absent" name="Absent" stroke={COLORS.absent} fill="url(#gradAbsent)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="late" name="Late" stroke={COLORS.late} fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center gap-2">
                                    <UsersRound className="h-10 w-10 text-muted-foreground/40" />
                                    <p className="text-sm font-medium text-muted-foreground">No Attendance Yet</p>
                                    <p className="text-xs text-muted-foreground/60">Data appears once recorded</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Today's Attendance Bar Chart */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Today&apos;s Breakdown</CardTitle>
                        <CardDescription>Student attendance status</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {attendanceChartLoading ? (
                            <Skeleton className="h-[220px] w-full rounded-lg" />
                        ) : attendanceBar.length > 0 ? (
                            <>
                                <div className="h-[180px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={attendanceBar} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                                            <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                                            <Tooltip content={<BarTooltip />} />
                                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                                                {attendanceBar.map((entry, i) => (
                                                    <Cell key={i} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-1.5 mt-2">
                                    {attendanceBar.map((item) => (
                                        <div key={item.name} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                                                <span className="text-muted-foreground">{item.name}</span>
                                            </div>
                                            <span className="font-medium">{item.value} ({item.percentage}%)</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-[220px] flex flex-col items-center justify-center gap-2">
                                <UsersRound className="h-10 w-10 text-muted-foreground/40" />
                                <p className="text-sm font-medium text-muted-foreground">No Attendance Yet</p>
                                <p className="text-xs text-muted-foreground/60">Data appears once recorded</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ═══ Fee Charts Row ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Fee Collection Area Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Fee Collection</CardTitle>
                                <CardDescription>
                                    {RANGE_OPTIONS.find(r => r.value === feeRange)?.label}
                                </CardDescription>
                            </div>
                            <Select value={feeRange} onValueChange={setFeeRange}>
                                <SelectTrigger className="w-[140px] h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {RANGE_OPTIONS.map(o => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            {feeChartLoading ? (
                                <div className="h-full flex items-center justify-center">
                                    <Skeleton className="h-full w-full rounded-lg" />
                                </div>
                            ) : feeTrend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={feeTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="gradFee" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={COLORS.fee} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={COLORS.fee} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" className="text-muted-foreground" />
                                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                                        <Tooltip content={<FeeTooltip />} />
                                        <Area type="monotone" dataKey="amount" name="Collection" stroke={COLORS.fee} fill="url(#gradFee)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center gap-2">
                                    <Wallet className="h-10 w-10 text-muted-foreground/40" />
                                    <p className="text-sm font-medium text-muted-foreground">No Collections Yet</p>
                                    <p className="text-xs text-muted-foreground/60">Fee payments will appear here</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Fee Breakdown Pie */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Fee Overview</CardTitle>
                        <CardDescription>Year-to-date breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {feeChartLoading ? (
                            <Skeleton className="h-[180px] w-full rounded-lg" />
                        ) : feePie.length > 0 ? (
                            <>
                                <div className="h-[160px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={feePie}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={65}
                                                dataKey="value"
                                                paddingAngle={3}
                                                strokeWidth={0}
                                            >
                                                {feePie.map((entry, i) => (
                                                    <Cell key={i} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<PieTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-2 mt-2">
                                    {feePie.map((item) => (
                                        <div key={item.name} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                                                    <span className="text-muted-foreground">{item.name}</span>
                                                </div>
                                                <span className="font-medium">₹{item.value.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${item.percentage}%`,
                                                        backgroundColor: item.fill,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-[180px] flex flex-col items-center justify-center gap-2">
                                <Wallet className="h-10 w-10 text-muted-foreground/40" />
                                <p className="text-sm font-medium text-muted-foreground">No Fee Data</p>
                                <p className="text-xs text-muted-foreground/60">Fee structure data will appear here</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

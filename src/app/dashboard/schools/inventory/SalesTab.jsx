"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle } from "lucide-react";
import {
    ShoppingCart, Search, Receipt, DollarSign, Users, RotateCcw,
    ChevronDown, ChevronUp, Calendar, BarChart3, ArrowUpRight,
    ArrowDownRight, ChevronLeft, ChevronRight, TrendingDown,
} from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

// Safe number coercion — old DB records may have null/0 from the Decimal bug
const toNum = (v) => {
    if (v === null || v === undefined) return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
};
const fmt = (v) => toNum(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Month label: "Mar '26" not "Mar 26" ─────────────────────────────────────
const monthLabel = (date) => {
    const mon = date.toLocaleString("default", { month: "short" });
    const yr = String(date.getFullYear()).slice(2);
    return `${mon} '${yr}`;
};

// ─── Sale line health check ───────────────────────────────────────────────────
// Flags bad historical records in the expanded row so admins know which
// past sales had the Decimal bug / data entry error.
// Returns { type: 'error'|'warning', message } | null
function checkSaleLine(si) {
    const unitPrice = toNum(si.unitPrice);
    const totalPrice = toNum(si.totalPrice);
    const cost = toNum(si.item?.costPerUnit);

    // unitPrice=0 → Decimal bug — stored as 0 when it should have been the selling price
    if (unitPrice === 0)
        return { type: "error", message: "Unit price recorded as ₹0 — this line has a data entry error" };

    // unitPrice < cost → selling below cost (may be intentional, flag as warning)
    if (cost > 0 && unitPrice < cost)
        return { type: "warning", message: `Sold at ₹${unitPrice.toFixed(2)} below cost ₹${cost.toFixed(2)} — loss of ₹${(cost - unitPrice).toFixed(2)}/unit` };

    // totalPrice mismatch → rounding or DB corruption
    const expected = Math.round(unitPrice * si.quantity * 100) / 100;
    if (Math.abs(totalPrice - expected) > 0.02)
        return { type: "warning", message: `Total ₹${totalPrice.toFixed(2)} doesn't match unit×qty (₹${expected.toFixed(2)})` };

    return null;
}

// ─── Chart colors ─────────────────────────────────────────────────────────────
const CHART_COLORS = [
    "hsl(221, 83%, 53%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
    "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(173, 80%, 40%)",
];
const PAYMENT_COLORS = {
    CASH: "hsl(142, 71%, 45%)", ONLINE: "hsl(221, 83%, 53%)",
    UPI: "hsl(262, 83%, 58%)", CARD: "hsl(38, 92%, 50%)",
};
const BUYER_TYPE_COLORS = {
    STUDENT: "hsl(221, 83%, 53%)", STAFF: "hsl(142, 71%, 45%)", EXTERNAL: "hsl(38, 92%, 50%)",
};

function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4"><Icon className="h-8 w-8 text-muted-foreground" /></div>
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
            {action}
        </div>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
            <p className="font-medium text-foreground mb-1">{label}</p>
            {payload.map((entry, i) => (
                <p key={i} style={{ color: entry.color }} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                    {entry.name}: ₹{fmt(entry.value)}
                </p>
            ))}
        </div>
    );
}

function PieTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const data = payload[0];
    return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
            <p className="font-medium text-foreground">{data.name}</p>
            <p style={{ color: data.payload.fill }}>₹{fmt(data.value)} ({data.payload.percentage}%)</p>
        </div>
    );
}

export default function SalesTab({ sales, onNewSale }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterBuyerType, setFilterBuyerType] = useState("all");
    const [filterPaymentMethod, setFilterPaymentMethod] = useState("all");
    const [filterDateRange, setFilterDateRange] = useState("all");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [expandedSale, setExpandedSale] = useState(null);
    const [reportView, setReportView] = useState("overview");
    const [trendMonth, setTrendMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });

    const now = new Date();

    const getDateRangeFilter = () => {
        switch (filterDateRange) {
            case "today": return new Date(now.getFullYear(), now.getMonth(), now.getDate());
            case "week": { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
            case "month": return new Date(now.getFullYear(), now.getMonth(), 1);
            case "quarter": return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            case "custom": return filterStartDate ? new Date(filterStartDate) : null;
            default: return null;
        }
    };

    const filteredSales = useMemo(() => {
        const startFilter = getDateRangeFilter();
        const endFilter = filterDateRange === "custom" && filterEndDate ? new Date(filterEndDate + "T23:59:59") : null;
        return [...sales]
            .filter((sale) => {
                if (searchTerm) {
                    const q = searchTerm.toLowerCase();
                    if (!sale.buyerName?.toLowerCase().includes(q) &&
                        !String(toNum(sale.totalAmount)).includes(q) &&
                        !sale.items?.some(si => si.item?.name?.toLowerCase().includes(q))) return false;
                }
                if (filterBuyerType !== "all" && sale.buyerType !== filterBuyerType) return false;
                if (filterPaymentMethod !== "all" && sale.paymentMethod !== filterPaymentMethod) return false;
                if (startFilter) {
                    const d = new Date(sale.saleDate);
                    if (d < startFilter) return false;
                    if (endFilter && d > endFilter) return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
    }, [sales, searchTerm, filterBuyerType, filterPaymentMethod, filterDateRange, filterStartDate, filterEndDate]);

    // ── Monthly chart data ────────────────────────────────────────────────────
    const monthlyData = useMemo(() => {
        const { year, month } = trendMonth;
        return Array.from({ length: 6 }, (_, i) => {
            const date = new Date(year, month - (5 - i), 1);
            const monthSales = sales.filter(s => {
                const sd = new Date(s.saleDate);
                return sd.getFullYear() === date.getFullYear() && sd.getMonth() === date.getMonth();
            });
            return {
                month: monthLabel(date),
                revenue: monthSales.reduce((sum, s) => sum + toNum(s.totalAmount), 0),
                count: monthSales.length,
            };
        });
    }, [sales, trendMonth]);

    const windowStartDate = new Date(trendMonth.year, trendMonth.month - 5, 1);
    const windowEndDate = new Date(trendMonth.year, trendMonth.month, 1);
    const trendWindowLabel = `${monthLabel(windowStartDate)} — ${monthLabel(windowEndDate)}`;
    const isCurrentMonth = trendMonth.year === now.getFullYear() && trendMonth.month === now.getMonth();

    const goToPrevMonth = () => setTrendMonth(prev => {
        const d = new Date(prev.year, prev.month - 6, 1);
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const goToNextMonth = () => {
        if (isCurrentMonth) return;
        setTrendMonth(prev => {
            const d = new Date(prev.year, prev.month + 6, 1);
            const cap = new Date();
            if (d > cap) return { year: cap.getFullYear(), month: cap.getMonth() };
            return { year: d.getFullYear(), month: d.getMonth() };
        });
    };

    // ── Month comparison ──────────────────────────────────────────────────────
    const monthComparison = useMemo(() => {
        const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        const thisMonthSales = sales.filter(s => new Date(s.saleDate) >= thisStart);
        const lastMonthSales = sales.filter(s => { const d = new Date(s.saleDate); return d >= lastStart && d <= lastEnd; });
        const thisRevenue = thisMonthSales.reduce((sum, s) => sum + toNum(s.totalAmount), 0);
        const lastRevenue = lastMonthSales.reduce((sum, s) => sum + toNum(s.totalAmount), 0);
        const revenueChange = lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue * 100) : (thisRevenue > 0 ? 100 : 0);
        const countChange = lastMonthSales.length > 0 ? ((thisMonthSales.length - lastMonthSales.length) / lastMonthSales.length * 100) : (thisMonthSales.length > 0 ? 100 : 0);
        return {
            thisMonth: { revenue: thisRevenue, count: thisMonthSales.length },
            revenueChange: revenueChange.toFixed(1),
            countChange: countChange.toFixed(1),
        };
    }, [sales]);

    const paymentBreakdown = useMemo(() => {
        const totals = {};
        sales.forEach(s => { const m = s.paymentMethod || "OTHER"; totals[m] = (totals[m] || 0) + toNum(s.totalAmount); });
        const grand = Object.values(totals).reduce((s, v) => s + v, 0);
        return Object.entries(totals).map(([name, value]) => ({
            name, value,
            percentage: grand > 0 ? (value / grand * 100).toFixed(1) : "0",
            fill: PAYMENT_COLORS[name] || CHART_COLORS[0],
        }));
    }, [sales]);

    const buyerBreakdown = useMemo(() => {
        const totals = {};
        sales.forEach(s => { const t = s.buyerType || "OTHER"; totals[t] = (totals[t] || 0) + toNum(s.totalAmount); });
        const grand = Object.values(totals).reduce((s, v) => s + v, 0);
        return Object.entries(totals).map(([name, value]) => ({
            name, value,
            percentage: grand > 0 ? (value / grand * 100).toFixed(1) : "0",
            fill: BUYER_TYPE_COLORS[name] || CHART_COLORS[3],
        }));
    }, [sales]);

    const dailyTrend = useMemo(() => {
        return Array.from({ length: 30 }, (_, i) => {
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i));
            const daySales = sales.filter(s => {
                const sd = new Date(s.saleDate);
                return sd.getFullYear() === date.getFullYear() && sd.getMonth() === date.getMonth() && sd.getDate() === date.getDate();
            });
            return {
                date: date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
                revenue: daySales.reduce((sum, s) => sum + toNum(s.totalAmount), 0),
                count: daySales.length,
            };
        });
    }, [sales]);

    const summaryStats = useMemo(() => {
        const totalRevenue = filteredSales.reduce((sum, s) => sum + toNum(s.totalAmount), 0);
        return {
            totalRevenue,
            avgSale: filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0,
            uniqueBuyers: new Set(filteredSales.map(s => s.buyerName)).size,
            totalItems: filteredSales.reduce((sum, s) => sum + (s.items?.length || 0), 0),
            salesCount: filteredSales.length,
        };
    }, [filteredSales]);

    // ── How many sales have at least one bad line ─────────────────────────────
    // Shown as a warning banner above the table so admins know to investigate
    const badSaleCount = useMemo(() => {
        return sales.filter(sale =>
            sale.items?.some(si => checkSaleLine(si) !== null)
        ).length;
    }, [sales]);

    const clearFilters = () => {
        setSearchTerm(""); setFilterBuyerType("all"); setFilterPaymentMethod("all");
        setFilterDateRange("all"); setFilterStartDate(""); setFilterEndDate("");
    };
    const hasActiveFilters = searchTerm || filterBuyerType !== "all" || filterPaymentMethod !== "all" || filterDateRange !== "all";

    if (sales.length === 0) {
        return (
            <Card><CardContent className="pt-6">
                <EmptyState
                    icon={Receipt}
                    title="No sales recorded yet"
                    description="Once you start selling inventory items, your sales history and reports will appear here."
                    action={<Button onClick={onNewSale}><ShoppingCart className="h-4 w-4 mr-2" />Record First Sale</Button>}
                />
            </CardContent></Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">This Month</p>
                                <p className="text-2xl font-bold mt-1">₹{fmt(monthComparison.thisMonth.revenue)}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    {parseFloat(monthComparison.revenueChange) >= 0
                                        ? <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                                        : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
                                    <span className={`text-xs font-medium ${parseFloat(monthComparison.revenueChange) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        {monthComparison.revenueChange}% vs last month
                                    </span>
                                </div>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sales Count</p>
                                <p className="text-2xl font-bold mt-1">{monthComparison.thisMonth.count}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    {parseFloat(monthComparison.countChange) >= 0
                                        ? <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                                        : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
                                    <span className={`text-xs font-medium ${parseFloat(monthComparison.countChange) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        {monthComparison.countChange}% vs last month
                                    </span>
                                </div>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <ShoppingCart className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg. Sale Value</p>
                                <p className="text-2xl font-bold mt-1">₹{fmt(summaryStats.avgSale)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Across {summaryStats.salesCount} sales</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                <BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unique Buyers</p>
                                <p className="text-2xl font-bold mt-1">{summaryStats.uniqueBuyers}</p>
                                <p className="text-xs text-muted-foreground mt-1">{summaryStats.totalItems} items sold</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">{reportView === "overview" ? "Monthly Revenue" : "Daily Trend (30 days)"}</CardTitle>
                                <CardDescription>{reportView === "overview" ? trendWindowLabel : "Last 30 days"}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {reportView === "overview" && (
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                                        <span className="text-xs font-medium min-w-[130px] text-center">{trendWindowLabel}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNextMonth} disabled={isCurrentMonth}><ChevronRight className="h-4 w-4" /></Button>
                                    </div>
                                )}
                                <div className="flex gap-1">
                                    <Button variant={reportView === "overview" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setReportView("overview")}>Monthly</Button>
                                    <Button variant={reportView === "trends" ? "default" : "ghost"} size="sm" className="h-7 text-xs" onClick={() => setReportView("trends")}>Daily</Button>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px] w-full">
                            {reportView === "overview" ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="revenue" name="Revenue" fill="hsl(221, 83%, 53%)" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dailyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(221, 83%, 53%)" fill="url(#salesGradient)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">By Payment Method</CardTitle></CardHeader>
                        <CardContent>
                            {paymentBreakdown.length > 0 ? (
                                <>
                                    <div className="h-[140px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3} strokeWidth={0}>
                                                    {paymentBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                                </Pie>
                                                <Tooltip content={<PieTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-1.5 mt-2">
                                        {paymentBreakdown.map((item) => (
                                            <div key={item.name} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                                                    <span className="text-muted-foreground">{item.name}</span>
                                                </div>
                                                <span className="font-medium">{item.percentage}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : <p className="text-sm text-muted-foreground text-center py-6">No data</p>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">By Buyer Type</CardTitle></CardHeader>
                        <CardContent>
                            {buyerBreakdown.length > 0 ? (
                                <div className="space-y-3">
                                    {buyerBreakdown.map((item) => (
                                        <div key={item.name} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">{item.name}</span>
                                                <span className="font-medium">₹{toNum(item.value).toLocaleString("en-IN", { minimumFractionDigits: 0 })}</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.percentage}%`, backgroundColor: item.fill }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-sm text-muted-foreground text-center py-6">No data</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Sales History */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Sales History</CardTitle>
                            <CardDescription>
                                {hasActiveFilters ? `Showing ${filteredSales.length} of ${sales.length} sales` : `${sales.length} total sales`}
                            </CardDescription>
                        </div>
                        <Button onClick={onNewSale}><ShoppingCart className="h-4 w-4 mr-2" />New Sale</Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">

                    {/* ── Data quality banner ──────────────────────────────────
                        Shown when historical records have unitPrice=0 or below-cost lines.
                        Tells the admin exactly how many sales need investigation so they
                        can fix them in Supabase before the bad data compounds. */}
                    {badSaleCount > 0 && (
                        <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-amber-800 dark:text-amber-300">
                                <span className="font-medium">{badSaleCount} sale{badSaleCount > 1 ? "s have" : " has"} a data quality issue</span>
                                {" "}— expand those rows to see which line items had incorrect prices recorded.
                                These may have affected your profit calculation.
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search by buyer, amount, or item..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                        </div>
                        <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                            <SelectTrigger><Calendar className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Date Range" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">Last 7 Days</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                                <SelectItem value="quarter">This Quarter</SelectItem>
                                <SelectItem value="custom">Custom Range</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterBuyerType} onValueChange={setFilterBuyerType}>
                            <SelectTrigger><SelectValue placeholder="Buyer Type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Buyers</SelectItem>
                                <SelectItem value="STUDENT">Student</SelectItem>
                                <SelectItem value="STAFF">Staff</SelectItem>
                                <SelectItem value="EXTERNAL">External</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                            <SelectTrigger><SelectValue placeholder="Payment" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Payments</SelectItem>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="ONLINE">Online</SelectItem>
                                <SelectItem value="UPI">UPI</SelectItem>
                                <SelectItem value="CARD">Card</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {filterDateRange === "custom" && (
                        <div className="flex gap-3 items-end">
                            <div className="space-y-1">
                                <Label className="text-xs">Start Date</Label>
                                <Input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-[160px]" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">End Date</Label>
                                <Input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-[160px]" />
                            </div>
                        </div>
                    )}

                    {hasActiveFilters && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">Active filters:</span>
                            {searchTerm && <Badge variant="secondary" className="text-xs">Search: &quot;{searchTerm}&quot;</Badge>}
                            {filterBuyerType !== "all" && <Badge variant="secondary" className="text-xs">Buyer: {filterBuyerType}</Badge>}
                            {filterPaymentMethod !== "all" && <Badge variant="secondary" className="text-xs">Payment: {filterPaymentMethod}</Badge>}
                            {filterDateRange !== "all" && <Badge variant="secondary" className="text-xs">Date: {filterDateRange}</Badge>}
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}><RotateCcw className="h-3 w-3 mr-1" />Clear</Button>
                        </div>
                    )}

                    {filteredSales.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No sales match your filters</p>
                            <Button variant="link" size="sm" onClick={clearFilters}>Clear all filters</Button>
                        </div>
                    ) : (
                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="dark:bg-background/50 bg-muted/50">
                                        <TableHead className="w-[30px]"></TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Buyer</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Items</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSales.map((sale, index) => {
                                        // Does this sale have any bad lines?
                                        const saleHasBadLine = sale.items?.some(si => checkSaleLine(si) !== null);

                                        return (
                                            <React.Fragment key={sale.id}>
                                                <TableRow
                                                    className={`cursor-pointer hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? "bg-muted/20 dark:bg-background/20" : ""}`}
                                                    onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                                                >
                                                    <TableCell className="pr-0">
                                                        {expandedSale === sale.id
                                                            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap text-sm">
                                                        {new Date(sale.saleDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {sale.buyerName}
                                                        {/* Small indicator dot on rows with bad data */}
                                                        {saleHasBadLine && (
                                                            <span className="ml-2 inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" title="This sale has a data quality issue — expand to see details" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell><Badge variant="outline" className="text-xs">{sale.buyerType}</Badge></TableCell>
                                                    <TableCell className="text-muted-foreground">{sale.items?.length || 0} item(s)</TableCell>
                                                    <TableCell className="text-right font-mono font-medium">₹{fmt(sale.totalAmount)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="text-xs" style={{ backgroundColor: PAYMENT_COLORS[sale.paymentMethod] ? `${PAYMENT_COLORS[sale.paymentMethod]}20` : undefined, color: PAYMENT_COLORS[sale.paymentMethod] }}>
                                                            {sale.paymentMethod}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                                                            {sale.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>

                                                {/* Expanded row — shows line items with per-line validation */}
                                                {expandedSale === sale.id && sale.items && (
                                                    <TableRow className="bg-muted/10 dark:bg-background/10">
                                                        <TableCell colSpan={8} className="py-3">
                                                            <div className="ml-6 rounded-md border overflow-hidden">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="bg-muted/40">
                                                                            <TableHead className="text-xs py-2">Item</TableHead>
                                                                            <TableHead className="text-xs py-2">Qty</TableHead>
                                                                            <TableHead className="text-xs py-2 text-right">Unit Price</TableHead>
                                                                            <TableHead className="text-xs py-2 text-right">Total</TableHead>
                                                                            <TableHead className="text-xs py-2">Status</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {sale.items.map((si) => {
                                                                            const lineCheck = checkSaleLine(si);
                                                                            return (
                                                                                <TableRow key={si.id} className={lineCheck?.type === "error" ? "bg-destructive/5" : lineCheck?.type === "warning" ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}>
                                                                                    <TableCell className="text-sm py-1.5">{si.item?.name || si.itemId}</TableCell>
                                                                                    <TableCell className="text-sm py-1.5 font-mono">{si.quantity}</TableCell>
                                                                                    <TableCell className={`text-sm py-1.5 text-right font-mono ${lineCheck?.type === "error" ? "text-destructive font-medium" : lineCheck?.type === "warning" ? "text-amber-600 dark:text-amber-400 font-medium" : ""}`}>
                                                                                        ₹{toNum(si.unitPrice).toFixed(2)}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-sm py-1.5 text-right font-mono font-medium">₹{toNum(si.totalPrice).toFixed(2)}</TableCell>
                                                                                    <TableCell className="py-1.5">
                                                                                        {lineCheck ? (
                                                                                            <div className={`flex items-center gap-1 text-xs ${lineCheck.type === "error" ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`}>
                                                                                                {lineCheck.type === "error"
                                                                                                    ? <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                                                                                    : <TrendingDown className="h-3 w-3 flex-shrink-0" />}
                                                                                                <span>{lineCheck.message}</span>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className="text-xs text-green-600 dark:text-green-400">✓ OK</span>
                                                                                        )}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        })}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
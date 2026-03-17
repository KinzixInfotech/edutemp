// components/inventory/ProfitCard.jsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import axios from "axios";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Format a number as ₹ with 2dp, thousands separator, and explicit + sign for positives
const fmtProfit = (n) => {
    const abs = Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < 0 ? `-₹${abs}` : `₹${abs}`;
};

export default function ProfitCard({ stats, schoolId, statsQueryKey }) {
    const [expanded, setExpanded] = useState(false);
    const [busting, setBusting] = useState(false);
    const queryClient = useQueryClient();

    const totalProfit = stats?.totalProfit ?? 0;
    const lossItems = stats?.lossItems ?? [];
    const isNegative = totalProfit < 0;
    const hasLoss = lossItems.length > 0;

    // Force-bust the server-side Redis cache for stats, then refetch
    const bustCache = async () => {
        setBusting(true);
        try {
            await axios.get(`/api/schools/${schoolId}/inventory/stats?bust=1`);
            await queryClient.invalidateQueries({ queryKey: statsQueryKey });
            await queryClient.refetchQueries({ queryKey: statsQueryKey });
            toast.success("Stats cache cleared and refreshed");
        } catch {
            toast.error("Failed to bust cache");
        } finally {
            setBusting(false);
        }
    };

    return (
        <Card className={isNegative || hasLoss ? "border-amber-200 dark:border-amber-800" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                <div className="flex items-center gap-1">
                    {/* One-click cache bust — shows when profit looks wrong */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={bustCache}
                        disabled={busting}
                        title="Force refresh stats (clears server cache)"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${busting ? "animate-spin" : ""}`} />
                    </Button>
                    {isNegative
                        ? <TrendingDown className="h-4 w-4 text-red-500" />
                        : <TrendingUp className="h-4 w-4 text-blue-500" />}
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {/* Main profit number */}
                <div className={`text-2xl font-bold ${isNegative ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}>
                    {fmtProfit(totalProfit)}
                </div>

                {/* Loss items summary — collapsed by default, expandable */}
                {hasLoss && (
                    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
                        <button
                            className="w-full flex items-center justify-between px-3 py-2 text-left"
                            onClick={() => setExpanded(!expanded)}
                        >
                            <div className="flex items-center gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                    {lossItems.length} item{lossItems.length > 1 ? "s" : ""} priced below cost
                                </span>
                            </div>
                            {expanded
                                ? <ChevronUp className="h-3.5 w-3.5 text-amber-500" />
                                : <ChevronDown className="h-3.5 w-3.5 text-amber-500" />}
                        </button>

                        {expanded && (
                            <div className="border-t border-amber-200 dark:border-amber-800 divide-y divide-amber-100 dark:divide-amber-900">
                                {lossItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between px-3 py-1.5">
                                        <span className="text-xs text-amber-800 dark:text-amber-200 truncate max-w-[140px]" title={item.name}>
                                            {item.name}
                                        </span>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="text-xs text-amber-600 dark:text-amber-400 font-mono">
                                                cost ₹{item.costPerUnit.toFixed(2)}
                                            </span>
                                            <span className="text-xs text-amber-600 dark:text-amber-400 font-mono">
                                                sell ₹{item.sellingPrice.toFixed(2)}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5 py-0 border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
                                            >
                                                -₹{item.lossPerUnit.toFixed(2)}/unit
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Positive note when everything looks healthy */}
                {!isNegative && !hasLoss && (
                    <p className="text-xs text-muted-foreground">All items priced above cost</p>
                )}
            </CardContent>
        </Card>
    );
}
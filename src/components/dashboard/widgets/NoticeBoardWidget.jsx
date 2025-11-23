'use client';
import { useQuery } from '@tanstack/react-query';
import { Bell, Calendar, Megaphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import WidgetContainer from "./WidgetContainer";
import Link from 'next/link';

const fetchNotices = async ({ schoolId, userId }) => {
    if (!schoolId || !userId) return [];
    const params = new URLSearchParams({
        userId,
        schoolId,
        limit: "5",
        offset: "0"
    });

    const res = await fetch(`/api/schools/notice/get?${params}`);
    if (!res.ok) throw new Error('Failed to fetch notices');
    const data = await res.json();
    return data.notices || [];
};

export default function NoticeBoardWidget({ fullUser, onRemove }) {
    const { data: notices, isLoading } = useQuery({
        queryKey: ['dashboardNotices', fullUser?.schoolId],
        queryFn: () => fetchNotices({ schoolId: fullUser?.schoolId, userId: fullUser?.id }),
        enabled: !!fullUser?.schoolId && !!fullUser?.id,
    });

    if (isLoading) {
        return (
            <WidgetContainer title="Notice Board" onRemove={onRemove} className="col-span-1 md:col-span-2">
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
            </WidgetContainer>
        );
    }

    const priorityColor = {
        NORMAL: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        IMPORTANT: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
        URGENT: "bg-red-500/10 text-red-600 border-red-500/20",
    };

    return (
        <WidgetContainer title="Notice Board" onRemove={onRemove} className="col-span-1 md:col-span-2">
            <div className="space-y-3">
                {notices && notices.length > 0 ? (
                    notices.map((notice) => (
                        <div
                            key={notice.id}
                            className="flex items-start gap-4 p-3 rounded-lg border border-border/40 bg-background/40 hover:bg-background/60 transition-colors"
                        >
                            <div className="p-2 rounded-md bg-primary/10 text-primary mt-1">
                                <Megaphone className="h-4 w-4" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-foreground line-clamp-1">{notice.title}</h4>
                                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border-0 ${priorityColor[notice.priority] || 'bg-gray-100 text-gray-800'}`}>
                                        {notice.priority}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">{notice.description}</p>
                                <div className="flex items-center gap-2 pt-1">
                                    <Calendar className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(notice.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">No recent notices</p>
                    </div>
                )}

                <div className="pt-2 border-t border-border/40 flex justify-end">
                    <Link href="/dashboard/schools/noticeboard" className="text-xs font-medium text-primary hover:underline">
                        View All Notices
                    </Link>
                </div>
            </div>
        </WidgetContainer>
    );
}

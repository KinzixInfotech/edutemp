'use client';

import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Eye, Star, Trophy, Image, Award, MessageSquare,
    TrendingUp, TrendingDown, Users, CheckCircle2, Clock, XCircle, AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function SchoolExplorerAnalytics() {
    const { fullUser } = useAuth();

    const { data: analytics, isLoading, isError } = useQuery({
        queryKey: ['school-explorer-analytics', fullUser?.schoolId],
        queryFn: async () => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/analytics`);
            if (!response.ok) throw new Error('Failed to fetch analytics');
            return response.json();
        },
        enabled: !!fullUser?.schoolId,
        staleTime: 2 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <Card key={i} className="p-6">
                            <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                            <Skeleton className="h-6 w-20 mb-2" />
                            <Skeleton className="h-4 w-32" />
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (isError || !analytics) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Card className="p-12 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Failed to Load Analytics</h3>
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                </Card>
            </div>
        );
    }

    if (!analytics.exists) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Card className="p-12 text-center">
                    <h3 className="text-xl font-semibold mb-4">Public Profile Not Created</h3>
                    <p className="text-muted-foreground mb-6">
                        Create your school's public profile to start receiving inquiries and improve visibility
                    </p>
                    <Link href="/dashboard/school-explorer/profile">
                        <Button>Create Public Profile</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    const StatCard = ({ icon: Icon, label, value, subtext, trend, color = "blue" }) => (
        <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className={`h-12 w-12 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`} />
                </div>
                {trend && (
                    <Badge variant={trend > 0 ? "default" : "secondary"} className="gap-1">
                        {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(trend)}%
                    </Badge>
                )}
            </div>
            <div className="text-3xl font-bold mb-1">{value}</div>
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
            {subtext && <div className="text-xs text-muted-foreground mt-2">{subtext}</div>}
        </Card>
    );

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">School Explorer Analytics</h1>
                    <p className="text-muted-foreground">
                        Track your public profile's performance and visitor engagement
                    </p>
                </div>
                <div className="flex gap-2">
                    {!analytics.isPubliclyVisible && (
                        <Badge variant="outline" className="gap-2">
                            <Clock className="h-3 w-3" />
                            Profile Hidden
                        </Badge>
                    )}
                    {analytics.isFeatured && (
                        <Badge className="gap-2">
                            <Trophy className="h-3 w-3" />
                            Featured
                        </Badge>
                    )}
                    {analytics.isVerified && (
                        <Badge variant="secondary" className="gap-2">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                        </Badge>
                    )}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Eye}
                    label="Profile Views"
                    value={analytics.profileViews.toLocaleString()}
                    subtext="Total profile visits"
                    color="blue"
                />
                <StatCard
                    icon={Star}
                    label="Overall Rating"
                    value={analytics.overallRating.toFixed(1)}
                    subtext={`${analytics.ratingsCount} reviews`}
                    color="yellow"
                />
                <StatCard
                    icon={Users}
                    label="Total Inquiries"
                    value={analytics.inquiries.total}
                    subtext={`${analytics.inquiries.new} new`}
                    color="purple"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Conversion Rate"
                    value={`${analytics.inquiries.conversionRate}%`}
                    subtext={`${analytics.inquiries.converted} converted`}
                    color="green"
                />
            </div>

            {/* Ratings Breakdown */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Ratings Breakdown</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Star className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{analytics.academicRating.toFixed(1)}</div>
                            <div className="text-sm text-muted-foreground">Academic</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Trophy className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{analytics.sportsRating.toFixed(1)}</div>
                            <div className="text-sm text-muted-foreground">Sports</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Award className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{analytics.infrastructureRating.toFixed(1)}</div>
                            <div className="text-sm text-muted-foreground">Infrastructure</div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Content Stats */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Content Overview</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                        <Award className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                        <div className="text-2xl font-bold">{analytics.achievementsCount}</div>
                        <div className="text-sm text-muted-foreground">Achievements</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                        <Trophy className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold">{analytics.facilitiesCount}</div>
                        <div className="text-sm text-muted-foreground">Facilities</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                        <Image className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl font-bold">{analytics.galleryCount}</div>
                        <div className="text-sm text-muted-foreground">Gallery Photos</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold">{analytics.badgesCount}</div>
                        <div className="text-sm text-muted-foreground">Badges</div>
                    </div>
                </div>
            </Card>

            {/* Inquiry Trends */}
            {analytics.inquiries.monthlyTrend.length > 0 && (
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Inquiry Trends (Last 6 Months)</h2>
                    <div className="space-y-2">
                        {analytics.inquiries.monthlyTrend.map((item) => (
                            <div key={item.month} className="flex items-center gap-3">
                                <div className="w-24 text-sm font-medium shrink-0">
                                    {new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </div>
                                <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                                    <div
                                        className="bg-primary h-full flex items-center px-3 text-sm font-medium text-primary-foreground"
                                        style={{ width: `${Math.min((item.count / Math.max(...analytics.inquiries.monthlyTrend.map(t => t.count))) * 100, 100)}%` }}
                                    >
                                        {item.count}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Quick Actions */}
            <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Link href="/dashboard/school-explorer/profile">
                        <Button variant="outline" className="w-full">Edit Profile</Button>
                    </Link>
                    <Link href="/dashboard/school-explorer/inquiries">
                        <Button variant="outline" className="w-full">View Inquiries</Button>
                    </Link>
                    <Link href={`/explore/schools/${analytics.profileId}`} target="_blank">
                        <Button className="w-full">View Public Profile</Button>
                    </Link>
                </div>
            </Card>
        </div>
    );
}

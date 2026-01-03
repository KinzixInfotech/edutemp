'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  Bell,
  Search,
  Calendar,
  FileText, // Changed from TallyIcon/FileText mismatch
  Clock,
  Megaphone,
  AlertTriangle,
  Info,
  BookOpen,
  Truck,
  CreditCard,
  CheckCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

const CATEGORIES = [
  { value: 'GENERAL', label: 'General', color: 'bg-gray-500', icon: Info },
  { value: 'ACADEMIC', label: 'Academic', color: 'bg-blue-500', icon: BookOpen },
  { value: 'EXAM', label: 'Exam', color: 'bg-purple-500', icon: FileText },
  { value: 'EMERGENCY', label: 'Emergency', color: 'bg-red-500', icon: AlertTriangle },
  { value: 'EVENT', label: 'Event', color: 'bg-orange-500', icon: Calendar },
  { value: 'HOLIDAY', label: 'Holiday', color: 'bg-green-500', icon: Calendar },
  { value: 'FEE', label: 'Fee', color: 'bg-yellow-500', icon: CreditCard },
  { value: 'TRANSPORT', label: 'Transport', color: 'bg-cyan-500', icon: Truck },
];

export default function NoticeboardPage() {
  const { user, fullUser } = useAuth();
  const queryClient = useQueryClient();
  const schoolId = fullUser?.schoolId;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // 1. Fetch Notices
  const { data, isLoading, error } = useQuery({
    queryKey: ['noticeboard', schoolId],
    queryFn: async () => {
      if (!schoolId || !user?.id) return { notices: [] };
      const res = await fetch(`/api/schools/notice/get?userId=${user.id}&schoolId=${schoolId}&limit=50`);
      if (!res.ok) throw new Error('Failed to fetch notices');
      return res.json();
    },
    enabled: !!schoolId && !!user?.id,
  });

  const notices = data?.notices || [];

  // 2. Mark as Read - Clear Badge on Visit
  useEffect(() => {
    const markAsRead = async () => {
      if (user?.id) {
        try {
          await fetch('/api/notifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, type: 'NOTICE' }),
          });
          queryClient.invalidateQueries(['notifications-unread-count']);
        } catch (error) {
          console.error("Failed to clear notice badge:", error);
        }
      }
    };
    markAsRead();
  }, [user?.id, queryClient]);

  // 3. Stats Calculation (Consistent with Manage Notice)
  const stats = useMemo(() => {
    const total = notices.length;
    const urgent = notices.filter(n => n.priority === 'URGENT' || n.priority === 'CRITICAL').length;
    const today = notices.filter(n => new Date(n.publishedAt).toDateString() === new Date().toDateString()).length;
    return { total, urgent, today };
  }, [notices]);

  // 4. Filtering
  const filteredNotices = useMemo(() => {
    return notices.filter(notice => {
      const matchesSearch = !searchQuery ||
        notice.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notice.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'ALL' || notice.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [notices, searchQuery, filterCategory]);

  const getCategoryColor = (category) => {
    return CATEGORIES.find(c => c.value === category)?.color || 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] flex-col gap-4 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <div>
          <p className="text-lg font-semibold text-red-600">Failed to load notices</p>
          <p className="text-sm text-gray-500">{error.message}</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries(['noticeboard'])}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header - Consistent with Manage Notice */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            Noticeboard
          </h1>
          <p className="text-muted-foreground">Stay updated with the latest announcements and circulars.</p>
        </div>
        {/* No action button needed for viewer, but keeping structure if needed */}
      </div>

      {/* Stats Cards - Exact Match to Manage Notice */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Available to you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.urgent}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">Released today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{CATEGORIES.length}</div>
            <p className="text-xs text-muted-foreground">Topics covered</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid - Clean Cards without clutter */}
      {filteredNotices.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredNotices.map((notice) => (
            <Card key={notice.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Image Header */}
              {notice.fileUrl && (
                <div className="h-40 w-full relative bg-muted">
                  <Image
                    src={notice.fileUrl}
                    alt={notice.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getCategoryColor(notice.category)}`} />
                    <span className="text-xs font-semibold text-muted-foreground uppercase">{notice.category}</span>
                  </div>
                  {notice.priority !== 'NORMAL' && (
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                      {notice.priority}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg">
                  {notice.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {notice.subtitle || notice.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {/* Metadata Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-[10px]">
                      {(notice.issuedBy || 'A')[0]}
                    </div>
                    <span>{notice.issuedBy || 'Admin'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(notice.publishedAt), 'MMM d, yyyy')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8 border rounded-lg border-dashed">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No notices found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            We couldn't find any notices matching your current search or filters.
          </p>
          <Button
            variant="link"
            onClick={() => { setSearchQuery(''); setFilterCategory('ALL'); }}
            className="mt-2"
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Mail,
  Inbox,
  PhoneCall,
  CheckCircle2,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const STATUS_OPTIONS = ['all', 'NEW', 'IN_PROGRESS', 'CONTACTED', 'RESOLVED', 'SPAM'];
const EMAIL_STATUS_OPTIONS = ['all', 'PENDING', 'SENT', 'FAILED', 'SKIPPED'];

const statusClasses = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  CONTACTED: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
  SPAM: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800',
};

const emailStatusClasses = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  SENT: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800',
  FAILED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800',
  SKIPPED: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-300 dark:border-slate-800',
};

function formatDate(value) {
  if (!value) return '-';

  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || ''}`,
  };
}

export default function SuperAdminContactSubmissionsPage() {
  const { fullUser } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailStatusFilter, setEmailStatusFilter] = useState('all');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [draftStatus, setDraftStatus] = useState('NEW');
  const [draftNotes, setDraftNotes] = useState('');

  const canAccess = fullUser?.role?.name === 'SUPER_ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-contact-submissions', page, search, statusFilter, emailStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        ...(search ? { search } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(emailStatusFilter !== 'all' ? { emailStatus: emailStatusFilter } : {}),
      });

      const response = await fetch(`/api/super-admin/contact-submissions?${params}`, {
        headers: await getAuthHeaders(),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to fetch contact submissions');
      }

      return payload;
    },
    enabled: canAccess,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }) => {
      const response = await fetch('/api/super-admin/contact-submissions', {
        method: 'PATCH',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ id, status, adminNotes }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update submission');
      }

      return payload;
    },
    onSuccess: () => {
      toast.success('Submission updated successfully');
      queryClient.invalidateQueries({ queryKey: ['super-admin-contact-submissions'] });
      setSelectedSubmission(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update submission');
    },
  });

  const summary = data?.summary || {
    total: 0,
    new: 0,
    contacted: 0,
    today: 0,
    mailed: 0,
  };
  const items = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const detailMeta = useMemo(
    () => [
      ['Email', selectedSubmission?.email],
      ['Phone', selectedSubmission?.phone],
      ['School', selectedSubmission?.schoolName],
      ['Role', selectedSubmission?.role || 'Not provided'],
      ['Student Count', selectedSubmission?.studentCount || 'Not provided'],
      ['Preferred Demo Time', selectedSubmission?.demoPreferred || 'Not provided'],
      ['Submitted', formatDate(selectedSubmission?.submittedAt)],
      ['Email Sent', selectedSubmission?.emailSentAt ? formatDate(selectedSubmission.emailSentAt) : 'Not sent yet'],
      ['IP Address', selectedSubmission?.ipAddress || 'Unavailable'],
    ],
    [selectedSubmission]
  );

  if (!canAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            This page is only available for super admin users.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-[#0569ff] to-[#10B981] p-3 rounded-2xl shadow-sm">
          <Mail className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Submissions</h1>
          <p className="text-sm text-muted-foreground">
            Review website enquiries, email delivery status, and follow-up notes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-bold">{summary.total}</div>
            <Inbox className="h-5 w-5 text-slate-500" />
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">New</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{summary.new}</div>
            <Mail className="h-5 w-5 text-blue-500" />
          </CardContent>
        </Card>

        <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-violet-700 dark:text-violet-300">Contacted</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-bold text-violet-700 dark:text-violet-300">{summary.contacted}</div>
            <PhoneCall className="h-5 w-5 text-violet-500" />
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Today</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{summary.today}</div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Emails Sent</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{summary.mailed}</div>
            <Mail className="h-5 w-5 text-amber-500" />
          </CardContent>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name, school, phone, or email"
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'all' ? 'All Statuses' : option.replaceAll('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={emailStatusFilter}
            onValueChange={(value) => {
              setEmailStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full lg:w-[180px]">
              <SelectValue placeholder="Email status" />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'all' ? 'All Email States' : option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    No contact submissions found for the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.email}</div>
                        <div className="text-sm text-muted-foreground">{item.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.schoolName}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.role || 'Role not provided'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.submittedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusClasses[item.status] || ''}>
                        {item.status.replaceAll('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={emailStatusClasses[item.emailStatus] || ''}>
                        {item.emailStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setSelectedSubmission(item);
                          setDraftStatus(item.status);
                          setDraftNotes(item.adminNotes || '');
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => prev - 1)}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => prev + 1)}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedSubmission ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSubmission.name}</DialogTitle>
                <DialogDescription>
                  {selectedSubmission.schoolName} - {selectedSubmission.email}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-3">
                  {detailMeta.map(([label, value]) => (
                    <div key={label} className="rounded-xl border bg-muted/30 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
                      <div className="text-sm font-medium break-words">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border bg-card px-4 py-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Message</div>
                  <div className="text-sm leading-7 whitespace-pre-wrap">
                    {selectedSubmission.message || 'No message provided.'}
                  </div>
                </div>

                {selectedSubmission.emailError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
                    Email issue: {selectedSubmission.emailError}
                  </div>
                ) : null}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-2">Lead Status</div>
                    <Select value={draftStatus} onValueChange={setDraftStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.filter((option) => option !== 'all').map((option) => (
                          <SelectItem key={option} value={option}>
                            {option.replaceAll('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-2">Email Status</div>
                    <div className="h-10 rounded-md border px-3 flex items-center text-sm text-muted-foreground">
                      {selectedSubmission.emailStatus}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Admin Notes</div>
                  <Textarea
                    rows={5}
                    value={draftNotes}
                    onChange={(event) => setDraftNotes(event.target.value)}
                    placeholder="Add follow-up notes, call summary, or resolution details..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                  Close
                </Button>
                <Button
                  onClick={() =>
                    updateMutation.mutate({
                      id: selectedSubmission.id,
                      status: draftStatus,
                      adminNotes: draftNotes,
                    })
                  }
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

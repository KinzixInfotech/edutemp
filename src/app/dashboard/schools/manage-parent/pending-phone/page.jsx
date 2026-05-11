'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, Loader2, Phone, Search, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebounce } from '@/hooks/useDebounce';

export default function PendingParentPhonePage() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [formByParent, setFormByParent] = useState({});

  const pendingQueryKey = ['pendingParentPhones', schoolId, debouncedSearch];
  const { data = {}, isLoading, isFetching } = useQuery({
    queryKey: pendingQueryKey,
    queryFn: async () => {
      const res = await axios.get(`/api/schools/${schoolId}/parents/pending-phone`, {
        params: { search: debouncedSearch },
      });
      return res.data || {};
    },
    enabled: !!schoolId,
    refetchOnWindowFocus: false,
  });

  const activateMutation = useMutation({
    mutationFn: async ({ parentId, phone, password }) => {
      const res = await axios.post(`/api/schools/${schoolId}/parents/pending-phone`, {
        parentId,
        phone,
        password,
      });
      return res.data;
    },
    onSuccess: (result, variables) => {
      toast.success(`Parent login activated with ${result.loginValue}`);
      setFormByParent((prev) => ({ ...prev, [variables.parentId]: { phone: '', password: '' } }));
      queryClient.invalidateQueries({ queryKey: ['pendingParentPhones', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['parents', schoolId] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to activate parent login');
    },
  });

  const parents = data.parents || [];

  const updateForm = (parentId, patch) => {
    setFormByParent((prev) => ({
      ...prev,
      [parentId]: {
        phone: '',
        password: '',
        ...(prev[parentId] || {}),
        ...patch,
      },
    }));
  };

  const activateParent = (parent) => {
    const form = formByParent[parent.id] || {};
    const phone = String(form.phone || '').trim();
    const password = String(form.password || '').trim();

    if (phone.replace(/\D/g, '').length !== 10) {
      toast.error('Enter a valid 10-digit phone number');
      return;
    }
    if (password.length < 6) {
      toast.error('Parent password must be at least 6 characters');
      return;
    }

    activateMutation.mutate({ parentId: parent.id, phone, password });
  };

  if (!schoolId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2">
            <Link href="/dashboard/schools/manage-parent">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Parents
              </Button>
            </Link>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Phone className="h-6 w-6" />
            Pending Parent Phone Activation
          </h1>
          <p className="text-sm text-muted-foreground">
            Add real parent phone numbers, assign passwords, and enable parent app login.
          </p>
        </div>
        <Badge variant="outline" className="w-fit bg-amber-50 px-3 py-1 text-amber-700">
          {parents.length} pending
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Parent App Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search parent, student, or admission number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parent</TableHead>
                  <TableHead>Linked Children</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : parents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center">
                      <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
                      <p className="font-medium">No pending parent phone activations</p>
                      <p className="text-sm text-muted-foreground">Parents with phone login are already ready or active.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  parents.map((parent) => {
                    const form = formByParent[parent.id] || {};
                    return (
                      <TableRow key={parent.id}>
                        <TableCell>
                          <p className="font-medium">{parent.name}</p>
                          <p className="text-xs text-muted-foreground">{parent.phoneMissing ? 'Phone missing from import' : 'Password/app access inactive'}</p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {parent.children?.length ? parent.children.map((child) => (
                              <div key={child.id} className="text-sm">
                                <span className="font-medium">{child.name}</span>
                                <span className="text-muted-foreground"> · {child.admissionNo}</span>
                              </div>
                            )) : (
                              <span className="text-sm text-muted-foreground">No children linked</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={parent.phoneMissing ? 'border-amber-300 text-amber-700' : 'border-blue-300 text-blue-700'}>
                            {parent.authStatus === 'pending_phone' ? 'Pending phone' : 'Inactive access'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            inputMode="numeric"
                            placeholder="10-digit phone"
                            value={form.phone || ''}
                            onChange={(event) => updateForm(parent.id, { phone: event.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="password"
                            placeholder="Parent password"
                            value={form.password || ''}
                            onChange={(event) => updateForm(parent.id, { password: event.target.value })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            disabled={activateMutation.isPending}
                            onClick={() => activateParent(parent)}
                          >
                            {activateMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Users className="mr-2 h-4 w-4" />
                            )}
                            Activate
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {isFetching && !isLoading && (
            <p className="text-xs text-muted-foreground">Refreshing pending parents...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

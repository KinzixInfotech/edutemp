'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Edit,
  Eye,
  Loader2,
  Save,
  X,
  DollarSign,
  Calendar,
  Users,
  FileText,
  Copy,
  Archive,
  Lock,
  CheckCircle,
  AlertCircle,
  Filter,
  MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const feeSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  classId: z.number().positive(),
  mode: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'ONE_TIME']),
  enableInstallments: z.boolean().default(true),
  particulars: z.array(z.object({
    name: z.string().min(1),
    amount: z.number().positive(),
    category: z.string(),
    isOptional: z.boolean().default(false),
  })).min(1),
});

const STATUS_COLORS = {
  DRAFT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ARCHIVED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

const STATUS_LABELS = {
  DRAFT: 'Draft',
  ACTIVE: 'Active (Assigned)',
  ARCHIVED: 'Archived (Read-only)',
};

const STATUS_ICONS = {
  DRAFT: Edit,
  ACTIVE: CheckCircle,
  ARCHIVED: Archive,
};

export default function FeeStructuresManagement() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneTarget, setCloneTarget] = useState(null);
  const [cloneName, setCloneName] = useState('');
  const [cloneTargetYearId, setCloneTargetYearId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isEditing, setIsEditing] = useState(false);

  const { register, control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      enableInstallments: true,
      particulars: [{ name: '', amount: 0, category: 'TUITION', isOptional: false }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'particulars' });

  // Fetch academic years
  const { data: academicYears } = useQuery({
    queryKey: ['academic-years', schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!schoolId,
  });

  const academicYearId = academicYears?.find(y => y.isActive)?.id;

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

  // Fetch fee structures
  const { data: structures, isLoading } = useQuery({
    queryKey: ['fee-structures', schoolId, academicYearId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        schoolId,
        academicYearId,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        includeArchived: statusFilter === 'ARCHIVED' || statusFilter === 'all' ? 'true' : 'false',
      });
      const res = await fetch(`/api/schools/fee/global-structures?${params}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!schoolId && !!academicYearId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/schools/fee/global-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          schoolId,
          academicYearId,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Fee structure created successfully');
      queryClient.invalidateQueries(['fee-structures']);
      setIsCreateOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/schools/fee/global-structures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id: selectedStructure?.id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success('Fee structure updated');
      queryClient.invalidateQueries(['fee-structures']);
      setIsCreateOpen(false);
      setIsEditing(false);
      setSelectedStructure(null);
      reset({
        enableInstallments: true,
        particulars: [{ name: '', amount: 0, category: 'TUITION', isOptional: false }]
      });
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/schools/fee/global-structures?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Fee structure deleted');
      queryClient.invalidateQueries(['fee-structures']);
    },
    onError: (error) => {
      if (error.message.includes('Archive')) {
        toast.error(error.message, {
          action: {
            label: 'Archive Instead',
            onClick: () => handleArchive(deleteMutation.variables),
          },
        });
      } else {
        toast.error(error.message);
      }
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch('/api/schools/fee/global-structures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'archive' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Fee structure archived');
      queryClient.invalidateQueries(['fee-structures']);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Clone mutation
  const cloneMutation = useMutation({
    mutationFn: async ({ id, newName, targetAcademicYearId }) => {
      const res = await fetch('/api/schools/fee/global-structures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'clone', newName, targetAcademicYearId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Fee structure cloned as DRAFT');
      queryClient.invalidateQueries(['fee-structures']);
      setCloneDialogOpen(false);
      setCloneTarget(null);
      setCloneName('');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Unarchive mutation
  const unarchiveMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch('/api/schools/fee/global-structures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'unarchive' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Fee structure restored to ACTIVE');
      queryClient.invalidateQueries(['fee-structures']);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (structure) => {
    setSelectedStructure(structure);
    setIsEditing(true);
    reset({
      name: structure.name,
      description: structure.description || '',
      classId: structure.classId,
      mode: structure.mode,
      enableInstallments: structure.enableInstallments,
      particulars: structure.particulars.map(p => ({
        name: p.name,
        amount: p.amount,
        category: p.category,
        isOptional: p.isOptional
      }))
    });
    setIsCreateOpen(true);
  };

  const handleArchive = (id) => {
    archiveMutation.mutate(id);
  };

  const handleUnarchive = (id) => {
    unarchiveMutation.mutate(id);
  };

  const handleCloneClick = (structure) => {
    setCloneTarget(structure);
    setCloneName(`${structure.name} (Copy)`);
    setCloneTargetYearId(academicYearId); // Default to current active year
    setCloneDialogOpen(true);
  };

  const handleCloneConfirm = () => {
    if (cloneTarget && cloneName) {
      cloneMutation.mutate({
        id: cloneTarget.id,
        newName: cloneName,
        targetAcademicYearId: cloneTargetYearId,
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const totalAmount = watch('particulars')?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
  const enableInstallments = watch('enableInstallments');
  const selectedMode = watch('mode');

  const getInstallmentCount = (mode) => {
    switch (mode) {
      case 'MONTHLY': return 12;
      case 'QUARTERLY': return 4;
      case 'HALF_YEARLY': return 2;
      default: return 1;
    }
  };

  // Stats
  const stats = {
    total: structures?.length || 0,
    draft: structures?.filter(s => s.status === 'DRAFT').length || 0,
    active: structures?.filter(s => s.status === 'ACTIVE').length || 0,
    archived: structures?.filter(s => s.status === 'ARCHIVED').length || 0,
  };

  return (
    <TooltipProvider>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" />
              Fee Structures Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage fee templates with installment options</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) {
              setIsEditing(false);
              setSelectedStructure(null);
              reset({
                enableInstallments: true,
                particulars: [{ name: '', amount: 0, category: 'TUITION', isOptional: false }]
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setIsEditing(false);
                reset({
                  enableInstallments: true,
                  particulars: [{ name: '', amount: 0, category: 'TUITION', isOptional: false }]
                });
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Structure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditing ? 'Edit Fee Structure' : 'Create Fee Structure'}</DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Modify format and particulars. Only DRAFT structures can be edited.' : 'New structures start as DRAFT and become ACTIVE when assigned to students'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label>Structure Name *</Label>
                  <Input
                    {...register('name')}
                    placeholder="e.g., Class 10 Annual Fees 2024-25"
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    {...register('description')}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Class */}
                  <div className="space-y-2">
                    <Label>Class *</Label>
                    <Select onValueChange={(value) => setValue('classId', parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes?.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.classId && <p className="text-xs text-red-500">{errors.classId.message}</p>}
                  </div>

                  {/* Installments Toggle */}
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <div>
                      <Label className="font-medium">Enable Installments</Label>
                      <p className="text-xs text-muted-foreground">
                        Split total amount into multiple payments
                      </p>
                    </div>
                    <Switch
                      checked={enableInstallments}
                      onCheckedChange={(v) => {
                        setValue('enableInstallments', v);
                        if (!v) setValue('mode', 'YEARLY');
                      }}
                    />
                  </div>

                  {/* Mode (Conditional) */}
                  {enableInstallments && (
                    <div className="space-y-2">
                      <Label>Payment Mode *</Label>
                      <Select onValueChange={(value) => setValue('mode', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Monthly (12 installments)</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly (4 installments)</SelectItem>
                          <SelectItem value="HALF_YEARLY">Half Yearly (2 installments)</SelectItem>
                          <SelectItem value="YEARLY">Yearly (1 payment)</SelectItem>
                          <SelectItem value="ONE_TIME">One Time</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.mode && <p className="text-xs text-red-500">{errors.mode.message}</p>}
                    </div>
                  )}
                </div>


                {/* Installment Preview */}
                {enableInstallments && selectedMode && totalAmount > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                      Installment Preview
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {Array(Math.min(getInstallmentCount(selectedMode), 4)).fill(0).map((_, i) => (
                        <div key={i} className="text-center p-2 bg-white dark:bg-gray-800 rounded">
                          <p className="font-medium">Inst. {i + 1}</p>
                          <p>{formatCurrency(totalAmount / getInstallmentCount(selectedMode))}</p>
                        </div>
                      ))}
                    </div>
                    {getInstallmentCount(selectedMode) > 4 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        +{getInstallmentCount(selectedMode) - 4} more installments
                      </p>
                    )}
                  </div>
                )}

                {/* Fee Particulars */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Fee Particulars *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ name: '', amount: 0, category: 'TUITION', isOptional: false })}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 items-start p-3 border rounded-lg">
                        <div className="flex-1 space-y-2">
                          <Input
                            {...register(`particulars.${index}.name`)}
                            placeholder="Name (e.g., Tuition Fee)"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              {...register(`particulars.${index}.amount`, { valueAsNumber: true })}
                              placeholder="Amount"
                            />
                            <Select
                              value={watch(`particulars.${index}.category`)}
                              onValueChange={(value) => setValue(`particulars.${index}.category`, value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="TUITION">Tuition</SelectItem>
                                <SelectItem value="ADMISSION">Admission</SelectItem>
                                <SelectItem value="EXAMINATION">Examination</SelectItem>
                                <SelectItem value="LIBRARY">Library</SelectItem>
                                <SelectItem value="LABORATORY">Laboratory</SelectItem>
                                <SelectItem value="SPORTS">Sports</SelectItem>
                                <SelectItem value="TRANSPORT">Transport</SelectItem>
                                <SelectItem value="MISCELLANEOUS">Miscellaneous</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold">{formatCurrency(totalAmount)}</span>
                </div>

                {/* Submit */}
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isEditing ? 'Saving...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {isEditing ? 'Save Changes' : 'Create as Draft'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setStatusFilter('all')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">All Structures</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-yellow-500 transition-colors" onClick={() => setStatusFilter('DRAFT')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Draft</p>
                  <p className="text-2xl font-bold">{stats.draft}</p>
                </div>
                <Edit className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-green-500 transition-colors" onClick={() => setStatusFilter('ACTIVE')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-gray-500 transition-colors" onClick={() => setStatusFilter('ARCHIVED')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Archived</p>
                  <p className="text-2xl font-bold">{stats.archived}</p>
                </div>
                <Archive className="w-8 h-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'DRAFT', 'ACTIVE', 'ARCHIVED'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'All' : status}
            </Button>
          ))}
        </div>

        {/* Structures List */}
        {/* Structures List */}
        <div className="min-h-[200px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {structures?.length === 0 && (
                <Card className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No fee structures found</p>
                  {/* <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Structure
                  </Button> */}
                </Card>
              )}

              {structures?.map((structure) => {
                const StatusIcon = STATUS_ICONS[structure.status];
                const isDraft = structure.status === 'DRAFT';
                const isActive = structure.status === 'ACTIVE';
                const isArchived = structure.status === 'ARCHIVED';
                const assignedCount = structure._count?.studentFees || 0;

                return (
                  <Card key={structure.id} className={isArchived ? 'opacity-60 hover:opacity-100 transition-opacity' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg">{structure.name}</CardTitle>
                            <Badge className={STATUS_COLORS[structure.status]}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {STATUS_LABELS[structure.status]}
                            </Badge>
                            <Badge variant="outline">{structure.mode}</Badge>
                            {structure.version > 1 && (
                              <Badge variant="secondary">v{structure.version}</Badge>
                            )}
                          </div>
                          <CardDescription className="mt-1">
                            {structure.class?.className} • {structure.particulars?.length || 0} Particulars •
                            Created {new Date(structure.createdAt).toLocaleDateString()}
                            {structure.enableInstallments && structure.installmentRules?.length > 0 && (
                              <span className="ml-2 text-blue-600">• {structure.installmentRules.length} Installments</span>
                            )}
                          </CardDescription>
                        </div>

                        {/* Actions Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedStructure(structure);
                              setViewDetailsOpen(true);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>

                            {isDraft && (
                              <DropdownMenuItem onClick={() => handleEdit(structure)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={() => handleCloneClick(structure)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Clone
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {isActive && (
                              <DropdownMenuItem
                                onClick={() => handleArchive(structure.id)}
                                className="text-orange-600"
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            )}

                            {isArchived && (
                              <DropdownMenuItem
                                onClick={() => handleUnarchive(structure.id)}
                                className="text-blue-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Restore to Active
                              </DropdownMenuItem>
                            )}

                            {isDraft && (
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm('Delete this draft structure?')) {
                                    deleteMutation.mutate(structure.id);
                                  }
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}

                            {(isActive || isArchived) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center">
                                    <Lock className="w-4 h-4 mr-2" />
                                    {isArchived ? 'Cannot delete archived' : 'Cannot delete (assigned)'}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isArchived
                                    ? 'Archived structures are kept for historical reference'
                                    : `Assigned to ${assignedCount} students`
                                  }
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {/* Installment Preview */}
                      {structure.enableInstallments && structure.installmentRules?.length > 0 && (
                        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium mb-2">Payment Schedule</p>
                          <div className="grid grid-cols-4 md:grid-cols-6 gap-2 text-xs">
                            {structure.installmentRules.slice(0, 6).map(rule => (
                              <div key={rule.id} className="text-center border rounded-2xl p-2 bg-background">
                                <p className="font-medium">Inst. {rule.installmentNumber}</p>
                                <p className="text-sm font-bold">{formatCurrency(rule.amount)}</p>
                                <p className="text-muted-foreground text-xs">
                                  {new Date(rule.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </p>
                              </div>
                            ))}
                          </div>
                          {structure.installmentRules.length > 6 && (
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                              +{structure.installmentRules.length - 6} more installments
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Amount</p>
                            <p className="text-2xl font-bold">{formatCurrency(structure.totalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Assigned To</p>
                            <p className="text-lg font-semibold flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {assignedCount} Students
                            </p>
                          </div>
                        </div>

                        {isDraft && (
                          <Button>
                            <Users className="w-4 h-4 mr-2" />
                            Assign to Students
                          </Button>
                        )}

                        {isActive && (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            In Use
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* View Details Dialog */}
        {
          selectedStructure && (
            <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedStructure.name}
                    <Badge className={STATUS_COLORS[selectedStructure.status]}>
                      {STATUS_LABELS[selectedStructure.status]}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    {selectedStructure.class?.className} • {selectedStructure.mode}
                    {selectedStructure.version > 1 && ` • Version ${selectedStructure.version}`}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <h4 className="font-medium">Fee Particulars</h4>
                  {selectedStructure.particulars?.map((particular) => (
                    <div key={particular.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{particular.name}</p>
                        <p className="text-sm text-muted-foreground">{particular.category}</p>
                      </div>
                      <p className="font-bold text-lg">{formatCurrency(particular.amount)}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <span className="font-semibold text-lg">Total</span>
                    <span className="text-2xl font-bold">{formatCurrency(selectedStructure.totalAmount)}</span>
                  </div>

                  {selectedStructure.installmentRules?.length > 0 && (
                    <>
                      <h4 className="font-medium pt-4">Installment Schedule</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedStructure.installmentRules.map(rule => (
                          <div key={rule.id} className="p-3 border rounded-lg">
                            <div className="flex justify-between">
                              <span className="font-medium">Installment {rule.installmentNumber}</span>
                              <span className="font-bold">{formatCurrency(rule.amount)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Due: {new Date(rule.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )
        }

        {/* Clone Dialog */}
        <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clone Fee Structure</DialogTitle>
              <DialogDescription>
                Create a copy of this structure as a new DRAFT
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>New Structure Name</Label>
                <Input
                  value={cloneName}
                  onChange={(e) => setCloneName(e.target.value)}
                  placeholder="Enter name for the cloned structure"
                />
              </div>

              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Select value={cloneTargetYearId} onValueChange={setCloneTargetYearId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Academic Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears?.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name} {year.isActive && '(Current)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The structure will be cloned into this academic year.
                </p>
              </div>

              <Alert>
                <Copy className="w-4 h-4" />
                <AlertDescription>
                  Clone will copy all particulars and installment rules.
                  The new structure will be in <strong>DRAFT</strong> status.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCloneConfirm} disabled={cloneMutation.isPending || !cloneName}>
                {cloneMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cloning...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Create Clone
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div >
    </TooltipProvider >
  );
}
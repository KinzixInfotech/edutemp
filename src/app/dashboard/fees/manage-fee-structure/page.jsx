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
  FileText
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const feeSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  classId: z.number().positive(),
  mode: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']),
  particulars: z.array(z.object({
    name: z.string().min(1),
    amount: z.number().positive(),
    category: z.string(),
    isOptional: z.boolean().default(false),
  })).min(1),
});

export default function FeeStructuresManagement() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);

  const { register, control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(feeSchema),
    defaultValues: {
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
    queryKey: ['fee-structures', schoolId, academicYearId],
    queryFn: async () => {
      const params = new URLSearchParams({ schoolId, academicYearId });
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/schools/fee/global-structures?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Fee structure deleted');
      queryClient.invalidateQueries(['fee-structures']);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data) => {
    createMutation.mutate(data);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const totalAmount = watch('particulars')?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            Fee Structures Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage global fee templates</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Structure
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Fee Structure</DialogTitle>
              <DialogDescription>
                Create a new global fee structure template for a class
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

              <div className="grid grid-cols-2 gap-4">
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

                {/* Mode */}
                <div className="space-y-2">
                  <Label>Payment Mode *</Label>
                  <Select onValueChange={(value) => setValue('mode', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.mode && <p className="text-xs text-red-500">{errors.mode.message}</p>}
                </div>
              </div>

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
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Structure
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Structures List */}
      <div className="grid grid-cols-1 gap-4">
        {structures?.map((structure) => (
          <Card key={structure.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {structure.name}
                    <Badge variant="outline">{structure.mode}</Badge>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {structure.class.className} • {structure.particulars.length} Particulars • 
                    Created {new Date(structure.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedStructure(structure);
                      setViewDetailsOpen(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this structure?')) {
                        deleteMutation.mutate(structure.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold">{formatCurrency(structure.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned To</p>
                    <p className="text-lg font-semibold">
                      {structure._count?.studentFees || 0} Students
                    </p>
                  </div>
                </div>
                <Button variant="default">
                  <Users className="w-4 h-4 mr-2" />
                  Assign to Students
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View Details Dialog */}
      {selectedStructure && (
        <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedStructure.name}</DialogTitle>
              <DialogDescription>
                Fee structure details and particulars
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedStructure.particulars.map((particular, idx) => (
                <div key={particular.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{particular.name}</p>
                    <p className="text-sm text-muted-foreground">{particular.category}</p>
                  </div>
                  <p className="font-bold text-lg">{formatCurrency(particular.defaultAmount)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="font-semibold text-lg">Total</span>
                <span className="text-2xl font-bold">{formatCurrency(selectedStructure.totalAmount)}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
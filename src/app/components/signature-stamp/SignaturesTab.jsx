// components/signature-stamp/SignaturesTab.jsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
  name: z.string().min(1),
  designation: z.string().optional(),
  imageUrl: z.string().min(1),
  isDefault: z.boolean(),
  isActive: z.boolean(),
});

export default function SignaturesTab() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: signatures = [], isLoading } = useQuery({
    queryKey: ['signatures', schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/signatures/${schoolId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!schoolId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/signatures/${editingId}` : `/api/signatures/${schoolId}`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['signatures', schoolId]);
      setEditingId(null);
      reset();
      toast.success('Signature saved');
    },
    onError: () => toast.error('Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/signatures/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['signatures', schoolId]);
      toast.success('Signature deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  // const {
  //   register,
  //   handleSubmit,
  //   reset,
  //   formState: { errors },
  // } = useForm({
  //   resolver: zodResolver(formSchema),
  // });

  const {
    register,
    handleSubmit,
    reset,
    getValues, // Add this
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
  });
  const handleEdit = (sig) => {
    setEditingId(sig.id);
    reset(sig);
  };

  const onSubmit = (data) => saveMutation.mutate(data);

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const { url } = await res.json();
      reset({ ...getValues(), imageUrl: url });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Signatures</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
        <Label>Name</Label>
        <Input {...register('name')} />
        {errors.name && <p className="text-red-500">{errors.name.message}</p>}

        <Label>Designation</Label>
        <Input {...register('designation')} />

        <Label>Image</Label>
        <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e.target.files[0])} disabled={uploading} />

        <div className="flex items-center gap-2">
          <Label>Default</Label>
          <Switch {...register('isDefault')} />

        </div>

        <div className="flex items-center gap-2">
          <Label>Active</Label>
          <Switch {...register('isActive')} />
        </div>

        <Button type="submit" disabled={saveMutation.isPending || uploading}>
          {saveMutation.isPending ? <Loader2 className="mr-2 animate-spin" /> : null}
          {editingId ? 'Update' : 'Create'}
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signatures.map((sig) => (
            <TableRow key={sig.id}>
              <TableCell>{sig.name}</TableCell>
              <TableCell>{sig.designation}</TableCell>
              <TableCell>{sig.isDefault ? 'Yes' : 'No'}</TableCell>
              <TableCell>{sig.isActive ? 'Yes' : 'No'}</TableCell>
              <TableCell>
                <Button variant="ghost" onClick={() => handleEdit(sig)}><Edit size={16} /></Button>
                <Button variant="ghost" onClick={() => deleteMutation.mutate(sig.id)} disabled={deleteMutation.isPending}><Trash2 size={16} /></Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
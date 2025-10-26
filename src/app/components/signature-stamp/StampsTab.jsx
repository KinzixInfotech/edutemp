// components/signature-stamp/StampsTab.jsx
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
import { Loader2, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Switch } from '@/components/ui/switch';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  imageUrl: z.string().min(1, 'Image is required'),
  forDocument: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export default function StampsTab() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: stamps = [], isLoading } = useQuery({
    queryKey: ['stamps', schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/documents/stamps/${schoolId}`);
      if (!res.ok) throw new Error('Failed to fetch stamps');
      return res.json();
    },
    enabled: !!schoolId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/documents/stamps/manage/${editingId}` : `/api/documents/stamps/${schoolId}`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save stamp');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stamps', schoolId]);
      setEditingId(null);
      reset();
      toast.success('Stamp saved successfully');
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast.error('Failed to save stamp');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/stamps/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete stamp');
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stamps', schoolId]);
      toast.success('Stamp deleted successfully');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to delete stamp');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      imageUrl: '',
      forDocument: '',
      isDefault: false,
      isActive: true,
    },
  });

  const handleEdit = (stamp) => {
    setEditingId(stamp.id);
    reset({
      name: stamp.name,
      imageUrl: stamp.imageUrl,
      forDocument: stamp.forDocument || '',
      isDefault: stamp.isDefault,
      isActive: stamp.isActive,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    reset({
      name: '',
      imageUrl: '',
      forDocument: '',
      isDefault: false,
      isActive: true,
    });
  };

  const onSubmit = (data) => {
    saveMutation.mutate(data);
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');

      const { url } = await res.json();
      setValue('imageUrl', url);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
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
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Stamps</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 border rounded-lg p-4">
        <div className="space-y-2">
          <Label htmlFor="name">Stamp Name *</Label>
          <Input
            id="name"
            placeholder="e.g., School Official Stamp"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="forDocument">For Document Type</Label>
          <Input
            id="forDocument"
            placeholder="e.g., ID Card, Certificate, Report Card"
            {...register('forDocument')}
          />
          {errors.forDocument && (
            <p className="text-sm text-red-500">{errors.forDocument.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Stamp Image *</Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e.target.files?.[0])}
            disabled={uploading}
          />
          {uploading && (
            <p className="text-sm text-blue-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </p>
          )}
          {errors.imageUrl && (
            <p className="text-sm text-red-500">{errors.imageUrl.message}</p>
          )}
          {getValues('imageUrl') && (
            <div className="mt-2">
              <img
                src={getValues('imageUrl')}
                alt="Stamp preview"
                className="h-24 w-24 object-contain border rounded"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="isDefault"
              checked={getValues('isDefault')}
              onCheckedChange={(checked) => setValue('isDefault', checked)}
            />
            <Label htmlFor="isDefault" className="cursor-pointer">
              Set as Default
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="isActive"
              checked={getValues('isActive')}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active
            </Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={saveMutation.isPending || uploading}
          >
            {saveMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {editingId ? 'Update Stamp' : 'Create Stamp'}
          </Button>

          {editingId && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Preview</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>For Document</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stamps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No stamps found. Create your first stamp above.
                </TableCell>
              </TableRow>
            ) : (
              stamps.map((stamp) => (
                <TableRow key={stamp.id}>
                  <TableCell>
                    <img
                      src={stamp.imageUrl}
                      alt={stamp.name}
                      className="h-12 w-12 object-contain"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{stamp.name}</TableCell>
                  <TableCell>{stamp.forDocument || '-'}</TableCell>
                  <TableCell>
                    <span className={stamp.isDefault ? 'text-green-600' : 'text-gray-400'}>
                      {stamp.isDefault ? 'Yes' : 'No'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={stamp.isActive ? 'text-green-600' : 'text-gray-400'}>
                      {stamp.isActive ? 'Yes' : 'No'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(stamp)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(stamp.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Upload, Save, Trash2, XIcon, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useFileUpload } from '@/lib/useFileupload';
import { uploadFiles } from '@/app/components/utils/uploadThing';

// Custom Upload Component to handle specific file state
const ImageUploader = ({ currentUrl, onUrlChange, type, label }) => {
  const [uploading, setUploading] = useState(false);

  // File Upload Hook
  const [
    { files, isDragging, errors },
    { handleDragEnter, handleDragLeave, handleDragOver, handleDrop, openFileDialog, removeFile, getInputProps }
  ] = useFileUpload({
    accept: "image/png,image/jpeg,image/jpg",
    maxSize: 4 * 1024 * 1024, // 4MB
    maxFiles: 1
  });

  const preview = files[0]?.preview || currentUrl;

  const handleClear = () => {
    if (files[0]) removeFile(files[0].id);
    onUrlChange(null);
  };

  const handleUpload = async () => {
    if (!files[0]?.file) return;

    try {
      setUploading(true);
      const res = await uploadFiles("imageUploader", {
        files: [files[0].file],
      });

      if (res && res[0]) {
        const url = res[0].url; // Adjust if response structure differs (e.g. ufsUrl)
        onUrlChange(url);
        toast.success(`${label} uploaded!`);
        // Clear local file selection to show the remote URL now
        removeFile(files[0].id);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center min-h-[200px] relative bg-muted/20 transition-colors data-[dragging=true]:bg-accent/50"
      onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} data-dragging={isDragging || undefined}>

      <input {...getInputProps()} className="sr-only" />

      {preview ? (
        <div className="relative w-full h-full flex items-center justify-center group">
          <img src={preview} alt={label} className="max-h-40 object-contain" />
          <div className="absolute top-0 right-0 flex gap-2">
            {/* Show Upload Button if it's a local file waiting to be uploaded */}
            {files.length > 0 && !uploading && (
              <Button size="sm" onClick={handleUpload} className="h-8">
                <Upload className="h-4 w-4 mr-2" /> Upload
              </Button>
            )}
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={handleClear}
              disabled={uploading}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <Loader2 className="animate-spin h-6 w-6 text-primary" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <div className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border">
            <ImageIcon className="size-4 opacity-60" />
          </div>
          <p className="mb-1.5 text-sm font-medium">Drag & drop or click to upload</p>
          <p className="text-xs text-muted-foreground mb-4">PNG recommended (Max 4MB)</p>
          <Button variant="outline" onClick={openFileDialog} type="button">Select Image</Button>
        </div>
      )}
      {errors.length > 0 && <p className="text-xs text-destructive mt-2">{errors[0]}</p>}
    </div>
  );
};

export default function StampSettingsPage() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;
  const queryClient = useQueryClient();

  const [signatureUrl, setSignatureUrl] = useState(null);
  const [stampUrl, setStampUrl] = useState(null);

  const { isLoading } = useQuery({
    queryKey: ['document-settings', schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/schools/${schoolId}/settings/documents`);
      const data = await res.json();
      setSignatureUrl(data.signatureUrl);
      setStampUrl(data.stampUrl);
      return data;
    },
    enabled: !!schoolId
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`/api/schools/${schoolId}/settings/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Settings saved successfully");
      queryClient.invalidateQueries(['document-settings']);
    },
    onError: () => toast.error("Save failed")
  });

  // Wrapper to update state and auto-save if needed (optional, or rely on explicit save)
  // For this UI, let's auto-save when URL changes (after upload)
  const handleUrlChange = (type, url) => {
    if (type === 'signature') {
      setSignatureUrl(url);
      mutation.mutate({ signatureUrl: url });
    } else {
      setStampUrl(url);
      mutation.mutate({ stampUrl: url });
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Signature & Stamp Settings</h1>
        <p className="text-muted-foreground">Manage official signatures and stamps for generated documents.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Signature Card */}
        <Card>
          <CardHeader>
            <CardTitle>Principal Signature</CardTitle>
            <CardDescription>Upload a transparent PNG of the principal's signature.</CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader
              currentUrl={signatureUrl}
              onUrlChange={(url) => handleUrlChange('signature', url)}
              type="signature"
              label="Signature"
            />
          </CardContent>
        </Card>

        {/* Stamp Card */}
        <Card>
          <CardHeader>
            <CardTitle>School Stamp/Seal</CardTitle>
            <CardDescription>Upload a transparent PNG of the school stamp.</CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader
              currentUrl={stampUrl}
              onUrlChange={(url) => handleUrlChange('stamp', url)}
              type="stamp"
              label="Stamp"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
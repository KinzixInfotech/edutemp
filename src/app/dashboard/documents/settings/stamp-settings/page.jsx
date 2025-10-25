'use client'
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
// import TemplateBuilder from '@/components/TemplateBuilder'; // Fixed import
// import CustomDialog from '@/components/CustomDialog'; // New custom dialog
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils'; // shadcn utility for className merging
import TemplateBuilder from '@/app/components/FabricCanvas';


async function fetchTemplates(schoolId) {
  const response = await fetch(`/api/documents/${schoolId}`);
  if (!response.ok) throw new Error('Failed to fetch templates');
  return response.json();
}

async function fetchIssuedCertificates(schoolId) {
  const response = await fetch(`/api/documents/${schoolId}/issued`);
  if (!response.ok) throw new Error('Failed to fetch issued certificates');
  return response.json();
}

async function createTemplate(data) {
  const response = await fetch(`/api/documents/${data.schoolId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create template');
  return response.json();
}

async function updateTemplate({ id, schoolId, ...data }) {
  const response = await fetch(`/api/documents/${schoolId}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update template');
  return response.json();
}

async function deleteTemplate({ id, schoolId }) {
  const response = await fetch(`/api/documents/${schoolId}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete template');
  return true;
}

async function generateCertificate(data) {
  const response = await fetch(`/api/documents/${data.schoolId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to generate certificate');
  return response.json();
}

const CustomDialog = ({ open, onOpenChange, title, children }) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <DialogPrimitive.Content
          className={cn(
            'fixed w-screen dark:bg-muted max-w-full h-full top-1/2 left-1/2',
            '-translate-x-1/2  -translate-y-1/2 bg-white flex flex-col z-50',
            'overflow-hidden m-0'
          )}
        >
          <div className="flex justify-between items-center p-6 border-b">
            <DialogPrimitive.Title className="text-xl font-semibold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="p-1 hover:bg-gray-100 rounded-full">
              <X size={20} />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};


export default function DocumentsSettings() {
  const { fullUser } = useAuth();
  const schoolId = fullUser?.schoolId;
  const [dialogMode, setDialogMode] = useState(null);
  const [templateData, setTemplateData] = useState({ layoutConfig: { elements: [] } });
  const [templateError, setTemplateError] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [customFields, setCustomFields] = useState({});

  const queryClient = useQueryClient();

  const { data: { templates = [] } = {}, isLoading: templatesLoading } = useQuery({
    queryKey: ['templates', schoolId],
    queryFn: () => fetchTemplates(schoolId),
    enabled: !!schoolId,
  });

  const { data: { certificates = [] } = {}, isLoading: certificatesLoading } = useQuery({
    queryKey: ['certificates', schoolId],
    queryFn: () => fetchIssuedCertificates(schoolId),
    enabled: !!schoolId,
  });

  const createTemplateMutation = useMutation({
    mutationFn: createTemplate,
    onMutate: () => setSaving(true),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      setDialogMode(null);
      toast.success('Template created');
      setSaving(false);
    },
    onError: () => {
      setSaving(false);
      toast.error('Failed to create template');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: updateTemplate,
    onMutate: () => setSaving(true),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      setDialogMode(null);
      toast.success('Template updated');
      setSaving(false);
    },
    onError: () => {
      setSaving(false);
      toast.error('Failed to update template');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
      toast.success('Template deleted');
    },
    onError: () => toast.error('Failed to delete template'),
  });

  const generateCertificateMutation = useMutation({
    mutationFn: generateCertificate,
    onSuccess: (res) => {
      const pdfBlob = new Blob([res.pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${res.certificateNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      queryClient.invalidateQueries(['certificates']);
      toast.success('Certificate generated and downloaded');
    },
    onError: () => toast.error('Failed to generate certificate'),
  });

  const handleTemplateChange = (e) => {
    setTemplateData({ ...templateData, [e.target.name]: e.target.value });
  };

  const handleLayoutUpdate = (newLayoutConfig) => {
    setTemplateData({ ...templateData, layoutConfig: newLayoutConfig });
  };

  const handleTemplateSubmit = () => {
    if (!templateData.name || !templateData.type) {
      setTemplateError('Name and Type required');
      return;
    }
    const data = { ...templateData, schoolId };
    if (dialogMode === 'add-template') {
      createTemplateMutation.mutate(data);
    } else if (dialogMode === 'edit-template') {
      updateTemplateMutation.mutate({ id: templateData.id, schoolId, ...data });
    }
  };

  const handleAddTemplate = () => {
    setTemplateData({ layoutConfig: { elements: [] } });
    setTemplateError('');
    setDialogMode('add-template');
  };

  const handleEditTemplate = (template) => {
    setTemplateData(template);
    setTemplateError('');
    setDialogMode('edit-template');
  };

  const handleDeleteTemplate = (template) => {
    deleteTemplateMutation.mutate(template);
  };

  const handleGenerate = (templateId) => {
    if (!selectedStudentId || !selectedTemplateId) {
      toast.error('Select both a student and a template');
      return;
    }
    generateCertificateMutation.mutate({
      templateId: selectedTemplateId,
      studentId: selectedStudentId,
      schoolId,
      customFields,
    });
  };

  // Placeholder: Fetch students from API in production
  const students = []; // Replace with actual API call

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Document & Certificate Generation</h2>
      <div className="space-y-8">
        {/* Templates Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Certificate Templates</h3>
            <Button onClick={handleAddTemplate}>
              Create Template <Plus strokeWidth={2} />
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-muted sticky top-0 z-10">
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templatesLoading ? (
                  Array(5).fill(0).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    </TableRow>
                  ))
                ) : templates.length > 0 ? (
                  templates.map((template, index) => (
                    <TableRow key={template.id} className={index % 2 === 0 ? 'bg-muted' : 'bg-background'}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>{template.type}</TableCell>
                      <TableCell>{template.description}</TableCell>
                      <TableCell>{template.isDefault ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditTemplate(template)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteTemplate(template)}>
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTemplateId(template.id);
                            handleGenerate(template.id);
                          }}
                        >
                          Generate <Download size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">No templates found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Issued Certificates Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Issued Certificates</h3>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-muted sticky top-0 z-10">
                  <TableHead>#</TableHead>
                  <TableHead>Certificate Number</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificatesLoading ? (
                  Array(5).fill(0).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : certificates.length > 0 ? (
                  certificates.map((cert, index) => (
                    <TableRow key={cert.id} className={index % 2 === 0 ? 'bg-muted' : 'bg-background'}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{cert.certificateNumber}</TableCell>
                      <TableCell>{cert.student.user.name}</TableCell>
                      <TableCell>{cert.template.type}</TableCell>
                      <TableCell>{cert.status}</TableCell>
                      <TableCell>{new Date(cert.issueDate).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4">No certificates issued.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Custom Dialog for Template Management */}
      <CustomDialog
        open={!!dialogMode}
        onOpenChange={() => setDialogMode(null)}
        title={dialogMode === 'add-template' ? 'Create Template' : 'Edit Template'}
      >
        <div className="space-y-6 max-w-4xl mx-auto">
          {templateError && <p className="text-red-500 mb-4">{templateError}</p>}
          <div className="flex gap-2.5 flex-col">
            <Label htmlFor="name">Name*</Label>
            <Input id="name" name="name" value={templateData.name || ''} onChange={handleTemplateChange} />
          </div>
          <div className="flex gap-2.5 flex-col">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" value={templateData.description || ''} onChange={handleTemplateChange} />
          </div>
          <div className="flex gap-2.5 flex-col">
            <Label htmlFor="type">Type*</Label>
            <Select value={templateData.type || ''} onValueChange={(val) => setTemplateData({ ...templateData, type: val })}>
              <SelectTrigger className={'w-full'}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="character">Character</SelectItem>
                <SelectItem value="bonafide">Bonafide</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="leaving">Leaving</SelectItem>
                <SelectItem value="admit">Admit Card</SelectItem>
                <SelectItem value="competition">Competition</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2.5 flex-col">
            <Label>Layout Builder</Label>
            <TemplateBuilder
              layoutConfig={templateData.layoutConfig || { elements: [] }}
              onUpdate={handleLayoutUpdate}
              placeholders={['{{student.name}}', '{{student.dob}}', '{{student.class}}', '{{school.name}}', '{{qr_code}}', '{{photo}}', '{{date}}', '{{certificate_number}}']}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="isDefault">Default</Label>
            <input
              type="checkbox"
              id="isDefault"
              checked={templateData.isDefault || false}
              onChange={(e) => setTemplateData({ ...templateData, isDefault: e.target.checked })}
            />
          </div>
          <Button
            onClick={handleTemplateSubmit}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Saving
              </>
            ) : (
              'Save Template'
            )}
          </Button>
        </div>
      </CustomDialog>

      {/* Quick Generate Section */}
      <div className="mt-8 p-4 border rounded-lg flex flex-col gap-2.5">
        <h4 className="text-lg font-semibold">Quick Generate</h4>
        <div className="space-y-4">
          <div className='flex flex-col gap-2.5'>
            <Label htmlFor="template">Select Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-2.5'>

            <Label htmlFor="student">Select Student</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.userId}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='flex flex-col gap-2.5'>
            <Label>Custom Fields</Label>
            {Object.entries(customFields).map(([key, value], index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  placeholder="Field Name (e.g., event_name)"
                  value={key}
                  onChange={(e) => {
                    const newFields = { ...customFields };
                    delete newFields[key];
                    newFields[e.target.value] = value;
                    setCustomFields(newFields);
                  }}
                />
                <Input
                  placeholder="Value"
                  value={value}
                  onChange={(e) => setCustomFields({ ...customFields, [key]: e.target.value })}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newFields = { ...customFields };
                    delete newFields[key];
                    setCustomFields(newFields);
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomFields({ ...customFields, '': '' })}
            >
              Add Field
            </Button>
          </div>
          <Button className={'w-full'} onClick={() => handleGenerate(selectedTemplateId)}>
            Generate <Download size={14} className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
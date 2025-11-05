// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter, useParams } from 'next/navigation';
// import { useMutation } from '@tanstack/react-query';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import * as z from 'zod';
// import { toast } from 'sonner';
// import {
//     Save,
//     Loader2,
//     Award,
//     CreditCard,
//     FileText,
//     ArrowLeft,
//     Eye,
//     Image as ImageIcon,
//     Type,
//     Layout,
//     AlertCircle
// } from 'lucide-react';

// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Switch } from '@/components/ui/switch';
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import {
//     Select,
//     SelectContent,
//     SelectItem,
//     SelectTrigger,
//     SelectValue,
// } from '@/components/ui/select';
// import { useAuth } from '@/context/AuthContext';
// import FileUploadButton from '@/components/fileupload';
// import CropImageDialog from '@/app/components/CropImageDialog';
// import { uploadFiles } from '@/app/components/utils/uploadThing';

// const formSchema = z.object({
//     name: z.string().min(3, 'Name must be at least 3 characters'),
//     description: z.string().optional(),
//     type: z.string(),
//     isDefault: z.boolean().default(false),
//     backgroundColor: z.string().default('#FFFFFF'),
//     primaryColor: z.string().default('#1e40af'),
//     secondaryColor: z.string().default('#64748b'),
//     borderColor: z.string().default('#000000'),
//     borderWidth: z.number().min(0).max(20).default(2),
//     fontSize: z.number().min(8).max(72).default(14),
//     fontFamily: z.string().default('Arial'),
//     textColor: z.string().default('#000000'),
//     headerText: z.string().default(''),
//     footerText: z.string().default(''),
//     logoUrl: z.string().optional(),
//     signatureUrl: z.string().optional(),
//     stampUrl: z.string().optional(),
//     backgroundImage: z.string().optional(),
//     includeQRCode: z.boolean().default(false),
//     includeBarcode: z.boolean().default(false),
//     includePhoto: z.boolean().default(false),
//     orientation: z.enum(['portrait', 'landscape']).default('portrait'),
// });

// const TEMPLATE_CONFIGS = {
//     certificate: {
//         title: 'Certificate Template',
//         icon: Award,
//         apiEndpoint: 'certificate-templates',
//         backUrl: '/dashboard/documents/templates/certificate',
//         types: [
//             { value: 'character', label: 'Character Certificate' },
//             { value: 'bonafide', label: 'Bonafide Certificate' },
//             { value: 'transfer', label: 'Transfer Certificate' },
//             { value: 'completion', label: 'Course Completion' },
//             { value: 'participation', label: 'Participation' },
//             { value: 'achievement', label: 'Achievement' },
//         ],
//         defaultType: 'character',
//         previewAspect: '1/1.414',
//         showSignature: true,
//         showStamp: true,
//         showQR: false,
//         showPhoto: false,
//     },
//     idcard: {
//         title: 'ID Card Template',
//         icon: CreditCard,
//         apiEndpoint: 'idcard-templates',
//         backUrl: '/dashboard/documents/templates/id-card',
//         types: [
//             { value: 'student', label: 'Student ID' },
//             { value: 'teacher', label: 'Teacher ID' },
//             { value: 'staff', label: 'Staff ID' },
//             { value: 'visitor', label: 'Visitor Pass' },
//         ],
//         defaultType: 'student',
//         previewAspect: '0.63/1',
//         showSignature: false,
//         showStamp: false,
//         showQR: true,
//         showPhoto: true,
//     },
//     admitcard: {
//         title: 'Admit Card Template',
//         icon: FileText,
//         apiEndpoint: 'admitcard-templates',
//         backUrl: '/dashboard/documents/templates/admit-cards',
//         types: [
//             { value: 'midterm', label: 'Mid-term Exam' },
//             { value: 'final', label: 'Final Exam' },
//             { value: 'quarterly', label: 'Quarterly Exam' },
//             { value: 'annual', label: 'Annual Exam' },
//             { value: 'entrance', label: 'Entrance Test' },
//         ],
//         defaultType: 'midterm',
//         previewAspect: '1/1.414',
//         showSignature: true,
//         showStamp: true,
//         showQR: true,
//         showPhoto: true,
//     },
// };

// export default function CreateTemplatePage() {
//     const router = useRouter();
//     const params = useParams();
//     const [resetKeys, setResetKeys] = useState({
//         logo: 0,
//         signature: 0,
//         stamp: 0,
//         background: 0,
//     });
//     const [uploading, setUploading] = useState(false);
//     const [rawImage, setRawImage] = useState(null);
//     const [cropDialogOpen, setCropDialogOpen] = useState(false);
//     const [currentField, setCurrentField] = useState(null);
//     const { fullUser } = useAuth();
//     const schoolId = fullUser?.schoolId;

//     // Get template type from URL param
//     const templateType = params?.type;
//     const config = TEMPLATE_CONFIGS[templateType];

//     // If invalid type, show error
//     if (!templateType || !config) {
//         return (
//             <div className="flex items-center justify-center min-h-screen p-4">
//                 <Card className="max-w-md w-full">
//                     <CardHeader>
//                         <div className="flex items-center gap-2 text-destructive">
//                             <AlertCircle className="h-6 w-6" />
//                             <CardTitle className="text-xl">Invalid Template Type</CardTitle>
//                         </div>
//                     </CardHeader>
//                     <CardContent className="space-y-4">
//                         <Alert variant="destructive">
//                             <AlertCircle className="h-4 w-4" />
//                             <AlertTitle>Error</AlertTitle>
//                             <AlertDescription>
//                                 The template type "<strong>{params?.type || 'unknown'}</strong>" is not recognized.
//                             </AlertDescription>
//                         </Alert>

//                         <div className="space-y-2">
//                             <p className="text-sm text-muted-foreground">Valid template types:</p>
//                             <ul className="list-disc list-inside space-y-1 text-sm">
//                                 <li><code className="bg-muted px-2 py-0.5 rounded">certificate</code> - Certificate Templates</li>
//                                 <li><code className="bg-muted px-2 py-0.5 rounded">idcard</code> - ID Card Templates</li>
//                                 <li><code className="bg-muted px-2 py-0.5 rounded">admitcard</code> - Admit Card Templates</li>
//                             </ul>
//                         </div>

//                         <div className="flex flex-col gap-2 sm:flex-row">
//                             <Button
//                                 onClick={() => router.push('/dashboard/documents/templates/certificate')}
//                                 variant="outline"
//                                 className="flex-1"
//                             >
//                                 <Award className="mr-2 h-4 w-4" />
//                                 Certificates
//                             </Button>
//                             <Button
//                                 onClick={() => router.push('/dashboard/documents/templates/id-card')}
//                                 variant="outline"
//                                 className="flex-1"
//                             >
//                                 <CreditCard className="mr-2 h-4 w-4" />
//                                 ID Cards
//                             </Button>
//                             <Button
//                                 onClick={() => router.push('/dashboard/documents/templates/admit-cards')}
//                                 variant="outline"
//                                 className="flex-1"
//                             >
//                                 <FileText className="mr-2 h-4 w-4" />
//                                 Admit Cards
//                             </Button>
//                         </div>
//                     </CardContent>
//                 </Card>
//             </div>
//         );
//     }

//     const Icon = config.icon;

//     const {
//         register,
//         handleSubmit,
//         watch,
//         setValue,
//         formState: { errors },
//     } = useForm({
//         resolver: zodResolver(formSchema),
//         defaultValues: {
//             name: '',
//             description: '',
//             type: config.defaultType,
//             isDefault: false,
//             backgroundColor: '#FFFFFF',
//             primaryColor: '#1e40af',
//             secondaryColor: '#64748b',
//             borderColor: '#000000',
//             borderWidth: 2,
//             fontSize: 14,
//             fontFamily: 'Arial',
//             textColor: '#000000',
//             headerText: '',
//             footerText: '',
//             includeQRCode: config.showQR,
//             includeBarcode: false,
//             includePhoto: config.showPhoto,
//             orientation: 'portrait',
//         },
//     });

//     const watchedValues = watch();

//     const createMutation = useMutation({
//         mutationFn: async (data) => {
//             const layoutConfig = {
//                 backgroundColor: data.backgroundColor,
//                 primaryColor: data.primaryColor,
//                 secondaryColor: data.secondaryColor,
//                 borderColor: data.borderColor,
//                 borderWidth: data.borderWidth,
//                 fontSize: data.fontSize,
//                 fontFamily: data.fontFamily,
//                 textColor: data.textColor,
//                 headerText: data.headerText,
//                 footerText: data.footerText,
//                 logoUrl: data.logoUrl,
//                 signatureUrl: data.signatureUrl,
//                 stampUrl: data.stampUrl,
//                 backgroundImage: data.backgroundImage,
//                 includeQRCode: data.includeQRCode,
//                 includeBarcode: data.includeBarcode,
//                 includePhoto: data.includePhoto,
//                 orientation: data.orientation,
//             };

//             const res = await fetch(`/api/documents/${schoolId}/${config.apiEndpoint}`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     name: data.name,
//                     description: data.description,
//                     type: data.type,
//                     isDefault: data.isDefault,
//                     layoutConfig,
//                     createdById: fullUser?.id,
//                 }),
//             });

//             if (!res.ok) {
//                 const error = await res.json();
//                 throw new Error(error.error || 'Failed to create template');
//             }
//             return res.json();
//         },
//         onSuccess: () => {
//             toast.success('Template created successfully');
//             router.push(config.backUrl);
//         },
//         onError: (error) => {
//             toast.error(error.message || 'Failed to create template');
//         },
//     });

//     const handleImageUpload = (field, previewUrl) => {
//         if (!previewUrl || previewUrl === rawImage) return;
//         setCurrentField(field);
//         setRawImage(previewUrl);
//         setCropDialogOpen(true);
//     };

//     const onSubmit = (data) => {
//         createMutation.mutate(data);
//     };

//     if (!schoolId) {
//         return (
//             <div className="flex items-center justify-center min-h-screen">
//                 <Loader2 className="h-8 w-8 animate-spin" />
//             </div>
//         );
//     }

//     return (
//         <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
//             {cropDialogOpen && rawImage && currentField && (
//                 <CropImageDialog
//                     image={rawImage}
//                     onClose={() => { if (!uploading) setCropDialogOpen(false); }}
//                     uploading={uploading}
//                     open={cropDialogOpen}
//                     onCropComplete={async (croppedBlob) => {
//                         const now = new Date();
//                         const iso = now.toISOString().replace(/[:.]/g, "-");
//                         const perf = Math.floor(performance.now() * 1000);
//                         const timestamp = `${iso}-${perf}`;
//                         const filename = `${timestamp}.jpg`;
//                         const file = new File([croppedBlob], filename, { type: "image/jpeg" });
//                         try {
//                             setUploading(true);
//                             const res = await uploadFiles("logoupload", { files: [file] });
//                             if (res && res[0]?.url) {
//                                 setValue(currentField, res[0].ufsUrl);
//                                 toast.success("Image uploaded successfully!");
//                             } else {
//                                 toast.error("Upload failed");
//                             }
//                         } catch (err) {
//                             toast.error("Something went wrong during upload");
//                             console.error(err);
//                         } finally {
//                             setUploading(false);
//                             setCropDialogOpen(false);
//                             setCurrentField(null);
//                             setRawImage(null);
//                         }
//                     }}
//                 />
//             )}
//             {/* Header */}
//             <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//                 <div className="space-y-1">
//                     <div className="flex items-center gap-2">
//                         <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
//                             <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
//                             <span>Create {config.title}</span>
//                         </h1>
//                     </div>
//                     <p className="text-xs sm:text-sm text-muted-foreground ml-10 sm:ml-12">
//                         Design a new {config.title.toLowerCase()} for your school
//                     </p>
//                 </div>
//                 <div className="flex gap-2">
//                     <Button
//                         onClick={handleSubmit(onSubmit)}
//                         disabled={createMutation.isPending || uploading}
//                         size="sm"
//                     >
//                         {createMutation.isPending ? (
//                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                         ) : (
//                             <Save className="mr-2 h-4 w-4" />
//                         )}
//                         Save Template
//                     </Button>
//                 </div>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
//                 {/* Form Section */}
//                 <div className="space-y-4">
//                     <Tabs defaultValue="basic" className="w-full">
//                         <TabsList className="grid w-full grid-cols-3">
//                             <TabsTrigger value="basic" className="text-xs sm:text-sm">
//                                 <Type className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
//                                 Basic
//                             </TabsTrigger>
//                             <TabsTrigger value="design" className="text-xs sm:text-sm">
//                                 <Layout className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
//                                 Design
//                             </TabsTrigger>
//                             <TabsTrigger value="assets" className="text-xs sm:text-sm">
//                                 <ImageIcon className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
//                                 Assets
//                             </TabsTrigger>
//                         </TabsList>

//                         {/* Basic Info Tab */}
//                         <TabsContent value="basic" className="space-y-4 mt-4">
//                             <Card>
//                                 <CardHeader>
//                                     <CardTitle className="text-base sm:text-lg">Basic Information</CardTitle>
//                                     <CardDescription className="text-xs sm:text-sm">
//                                         Enter the template details
//                                     </CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4">
//                                     <div className="space-y-2">
//                                         <Label htmlFor="name" className="text-sm">Template Name *</Label>
//                                         <Input
//                                             id="name"
//                                             {...register('name')}
//                                             placeholder={`e.g., ${config.title} 2024`}
//                                             className="text-sm"
//                                         />
//                                         {errors.name && (
//                                             <p className="text-xs text-red-500">{errors.name.message}</p>
//                                         )}
//                                     </div>

//                                     <div className="space-y-2">
//                                         <Label htmlFor="description" className="text-sm">Description</Label>
//                                         <Textarea
//                                             id="description"
//                                             {...register('description')}
//                                             placeholder="Brief description of this template"
//                                             rows={3}
//                                             className="text-sm"
//                                         />
//                                     </div>

//                                     <div className="space-y-2">
//                                         <Label htmlFor="type" className="text-sm">Type *</Label>
//                                         <Select
//                                             value={watchedValues.type}
//                                             onValueChange={(value) => setValue('type', value)}
//                                         >
//                                             <SelectTrigger className="text-sm">
//                                                 <SelectValue />
//                                             </SelectTrigger>
//                                             <SelectContent>
//                                                 {config.types.map((type) => (
//                                                     <SelectItem key={type.value} value={type.value}>
//                                                         {type.label}
//                                                     </SelectItem>
//                                                 ))}
//                                             </SelectContent>
//                                         </Select>
//                                     </div>

//                                     {templateType !== 'certificate' && (
//                                         <div className="space-y-2">
//                                             <Label htmlFor="orientation" className="text-sm">Orientation</Label>
//                                             <Select
//                                                 value={watchedValues.orientation}
//                                                 onValueChange={(value) => setValue('orientation', value)}
//                                             >
//                                                 <SelectTrigger className="text-sm">
//                                                     <SelectValue />
//                                                 </SelectTrigger>
//                                                 <SelectContent>
//                                                     <SelectItem value="portrait">Portrait</SelectItem>
//                                                     <SelectItem value="landscape">Landscape</SelectItem>
//                                                 </SelectContent>
//                                             </Select>
//                                         </div>
//                                     )}

//                                     <div className="flex items-center justify-between py-2">
//                                         <div className="space-y-0.5">
//                                             <Label htmlFor="isDefault" className="text-sm">Set as Default</Label>
//                                             <p className="text-xs text-muted-foreground">
//                                                 Use this template by default for this type
//                                             </p>
//                                         </div>
//                                         <Switch
//                                             id="isDefault"
//                                             checked={watchedValues.isDefault}
//                                             onCheckedChange={(checked) => setValue('isDefault', checked)}
//                                         />
//                                     </div>

//                                     {/* Conditional Features */}
//                                     {config.showQR && (
//                                         <div className="flex items-center justify-between py-2">
//                                             <Label htmlFor="includeQRCode" className="text-sm">Include QR Code</Label>
//                                             <Switch
//                                                 id="includeQRCode"
//                                                 checked={watchedValues.includeQRCode}
//                                                 onCheckedChange={(checked) => setValue('includeQRCode', checked)}
//                                             />
//                                         </div>
//                                     )}

//                                     {config.showPhoto && (
//                                         <div className="flex items-center justify-between py-2">
//                                             <Label htmlFor="includePhoto" className="text-sm">Include Photo</Label>
//                                             <Switch
//                                                 id="includePhoto"
//                                                 checked={watchedValues.includePhoto}
//                                                 onCheckedChange={(checked) => setValue('includePhoto', checked)}
//                                             />
//                                         </div>
//                                     )}
//                                 </CardContent>
//                             </Card>
//                         </TabsContent>

//                         {/* Design Tab */}
//                         <TabsContent value="design" className="space-y-4 mt-4">
//                             <Card>
//                                 <CardHeader>
//                                     <CardTitle className="text-base sm:text-lg">Design Settings</CardTitle>
//                                     <CardDescription className="text-xs sm:text-sm">
//                                         Customize the appearance
//                                     </CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4">
//                                     <div className="grid grid-cols-2 gap-4">
//                                         <div className="space-y-2">
//                                             <Label htmlFor="backgroundColor" className="text-sm">Background</Label>
//                                             <Input
//                                                 id="backgroundColor"
//                                                 type="color"
//                                                 {...register('backgroundColor')}
//                                                 className="h-10"
//                                             />
//                                         </div>
//                                         <div className="space-y-2">
//                                             <Label htmlFor="primaryColor" className="text-sm">Primary Color</Label>
//                                             <Input
//                                                 id="primaryColor"
//                                                 type="color"
//                                                 {...register('primaryColor')}
//                                                 className="h-10"
//                                             />
//                                         </div>
//                                     </div>

//                                     {templateType === 'certificate' && (
//                                         <div className="grid grid-cols-2 gap-4">
//                                             <div className="space-y-2">
//                                                 <Label htmlFor="borderColor" className="text-sm">Border Color</Label>
//                                                 <Input
//                                                     id="borderColor"
//                                                     type="color"
//                                                     {...register('borderColor')}
//                                                     className="h-10"
//                                                 />
//                                             </div>
//                                             <div className="space-y-2">
//                                                 <Label htmlFor="borderWidth" className="text-sm">Border Width (px)</Label>
//                                                 <Input
//                                                     id="borderWidth"
//                                                     type="number"
//                                                     {...register('borderWidth', { valueAsNumber: true })}
//                                                     min="0"
//                                                     max="20"
//                                                     className="text-sm"
//                                                 />
//                                             </div>
//                                         </div>
//                                     )}

//                                     <div className="space-y-2">
//                                         <Label htmlFor="fontFamily" className="text-sm">Font Family</Label>
//                                         <Select
//                                             value={watchedValues.fontFamily}
//                                             onValueChange={(value) => setValue('fontFamily', value)}
//                                         >
//                                             <SelectTrigger className="text-sm">
//                                                 <SelectValue />
//                                             </SelectTrigger>
//                                             <SelectContent>
//                                                 <SelectItem value="Arial">Arial</SelectItem>
//                                                 <SelectItem value="Times New Roman">Times New Roman</SelectItem>
//                                                 <SelectItem value="Georgia">Georgia</SelectItem>
//                                                 <SelectItem value="Courier New">Courier New</SelectItem>
//                                                 <SelectItem value="Verdana">Verdana</SelectItem>
//                                             </SelectContent>
//                                         </Select>
//                                     </div>

//                                     <div className="grid grid-cols-2 gap-4">
//                                         <div className="space-y-2">
//                                             <Label htmlFor="fontSize" className="text-sm">Font Size (px)</Label>
//                                             <Input
//                                                 id="fontSize"
//                                                 type="number"
//                                                 {...register('fontSize', { valueAsNumber: true })}
//                                                 min="8"
//                                                 max="72"
//                                                 className="text-sm"
//                                             />
//                                         </div>
//                                         <div className="space-y-2">
//                                             <Label htmlFor="textColor" className="text-sm">Text Color</Label>
//                                             <Input
//                                                 id="textColor"
//                                                 type="color"
//                                                 {...register('textColor')}
//                                                 className="h-10"
//                                             />
//                                         </div>
//                                     </div>

//                                     <div className="space-y-2">
//                                         <Label htmlFor="headerText" className="text-sm">Header Text</Label>
//                                         <Input
//                                             id="headerText"
//                                             {...register('headerText')}
//                                             placeholder="e.g., School Name"
//                                             className="text-sm"
//                                         />
//                                     </div>

//                                     <div className="space-y-2">
//                                         <Label htmlFor="footerText" className="text-sm">Footer Text</Label>
//                                         <Input
//                                             id="footerText"
//                                             {...register('footerText')}
//                                             placeholder="e.g., Authorized Signature"
//                                             className="text-sm"
//                                         />
//                                     </div>
//                                 </CardContent>
//                             </Card>
//                         </TabsContent>

//                         {/* Assets Tab */}
//                         <TabsContent value="assets" className="space-y-4 mt-4">
//                             <Card>
//                                 <CardHeader>
//                                     <CardTitle className="text-base sm:text-lg">Assets & Images</CardTitle>
//                                     <CardDescription className="text-xs sm:text-sm">
//                                         Upload logos, signatures, and stamps
//                                     </CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="space-y-4">
//                                     <div className="space-y-2">
//                                         <Label className="text-sm">School Logo</Label>
//                                         <FileUploadButton 
//                                             onChange={(previewUrl) => handleImageUpload('logoUrl', previewUrl)} 
//                                             resetKey={resetKeys.logo}
//                                             disabled={uploading}
//                                         />
//                                         {watchedValues.logoUrl && (
//                                             <div className="mt-2">
//                                                 <img
//                                                     src={watchedValues.logoUrl}
//                                                     alt="Logo"
//                                                     className="h-20 w-auto border rounded"
//                                                 />
//                                             </div>
//                                         )}
//                                     </div>

//                                     {config.showSignature && (
//                                         <div className="space-y-2">
//                                             <Label className="text-sm">Signature</Label>
//                                             <FileUploadButton 
//                                                 onChange={(previewUrl) => handleImageUpload('signatureUrl', previewUrl)} 
//                                                 resetKey={resetKeys.signature}
//                                                 disabled={uploading}
//                                             />
//                                             {watchedValues.signatureUrl && (
//                                                 <div className="mt-2">
//                                                     <img
//                                                         src={watchedValues.signatureUrl}
//                                                         alt="Signature"
//                                                         className="h-20 w-auto border rounded"
//                                                     />
//                                                 </div>
//                                             )}
//                                         </div>
//                                     )}

//                                     {config.showStamp && (
//                                         <div className="space-y-2">
//                                             <Label className="text-sm">Stamp/Seal</Label>
//                                             <FileUploadButton 
//                                                 onChange={(previewUrl) => handleImageUpload('stampUrl', previewUrl)} 
//                                                 resetKey={resetKeys.stamp}
//                                                 disabled={uploading}
//                                             />
//                                             {watchedValues.stampUrl && (
//                                                 <div className="mt-2">
//                                                     <img
//                                                         src={watchedValues.stampUrl}
//                                                         alt="Stamp"
//                                                         className="h-20 w-auto border rounded"
//                                                     />
//                                                 </div>
//                                             )}
//                                         </div>
//                                     )}

//                                     <div className="space-y-2">
//                                         <Label className="text-sm">Background Image (Optional)</Label>
//                                         <FileUploadButton 
//                                             onChange={(previewUrl) => handleImageUpload('backgroundImage', previewUrl)} 
//                                             resetKey={resetKeys.background}
//                                             disabled={uploading}
//                                         />
//                                         {watchedValues.backgroundImage && (
//                                             <div className="mt-2">
//                                                 <img
//                                                     src={watchedValues.backgroundImage}
//                                                     alt="Background"
//                                                     className="h-20 w-auto border rounded"
//                                                 />
//                                             </div>
//                                         )}
//                                     </div>
//                                 </CardContent>
//                             </Card>
//                         </TabsContent>
//                     </Tabs>
//                 </div>

//                 {/* Preview Section */}
//                 <div className="lg:sticky lg:top-4 lg:self-start">
//                     <Card>
//                         <CardHeader>
//                             <CardTitle className="text-base sm:text-lg flex items-center gap-2">
//                                 <Eye className="h-4 w-4" />
//                                 Live Preview
//                             </CardTitle>
//                             <CardDescription className="text-xs sm:text-sm">
//                                 Preview how your {templateType} will look
//                             </CardDescription>
//                         </CardHeader>
//                         <CardContent>
//                             <div
//                                 className="border-2 rounded-lg p-4 sm:p-6 flex flex-col justify-between"
//                                 style={{
//                                     aspectRatio: config.previewAspect,
//                                     backgroundColor: watchedValues.backgroundColor,
//                                     borderColor: templateType === 'certificate' ? watchedValues.borderColor : watchedValues.primaryColor,
//                                     borderWidth: `${watchedValues.borderWidth || 2}px`,
//                                     color: watchedValues.textColor,
//                                     fontFamily: watchedValues.fontFamily,
//                                     backgroundImage: watchedValues.backgroundImage ? `url(${watchedValues.backgroundImage})` : 'none',
//                                     backgroundSize: 'cover',
//                                     backgroundPosition: 'center',
//                                 }}
//                             >
//                                 {/* Header */}
//                                 <div className="text-center space-y-2">
//                                     {watchedValues.logoUrl && (
//                                         <img
//                                             src={watchedValues.logoUrl}
//                                             alt="Logo"
//                                             className="h-8 sm:h-12 w-auto mx-auto"
//                                         />
//                                     )}
//                                     {watchedValues.headerText && (
//                                         <h2
//                                             className="text-sm sm:text-base font-bold"
//                                             style={{ color: watchedValues.primaryColor }}
//                                         >
//                                             {watchedValues.headerText}
//                                         </h2>
//                                     )}
//                                     <h3 className="text-xs sm:text-sm font-semibold uppercase">
//                                         {config.types.find(t => t.value === watchedValues.type)?.label}
//                                     </h3>
//                                 </div>

//                                 {/* Content */}
//                                 <div className="text-center space-y-2 flex-1 flex flex-col justify-center">
//                                     {watchedValues.includePhoto && (
//                                         <div
//                                             className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full mx-auto border-2"
//                                             style={{ borderColor: watchedValues.primaryColor }}
//                                         />
//                                     )}
//                                     <p className="text-xs" style={{ fontSize: `${watchedValues.fontSize}px` }}>
//                                         {templateType === 'certificate' ? 'This is to certify that' : 'Name: [Student Name]'}
//                                     </p>
//                                     <p className="text-sm font-bold">
//                                         {templateType === 'certificate' ? '[Student Name]' : 'ID: [Student ID]'}
//                                     </p>
//                                     {templateType === 'idcard' && (
//                                         <>
//                                             <p className="text-xs">Class: [Class Name]</p>
//                                             <p className="text-xs">Valid Until: [Date]</p>
//                                         </>
//                                     )}
//                                     {templateType === 'admitcard' && (
//                                         <>
//                                             <p className="text-xs">Seat No: [Seat Number]</p>
//                                             <p className="text-xs">Exam: [Exam Name]</p>
//                                             <p className="text-xs">Date: [Exam Date]</p>
//                                         </>
//                                     )}
//                                     {watchedValues.includeQRCode && (
//                                         <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black mx-auto mt-2" />
//                                     )}
//                                 </div>

//                                 {/* Footer */}
//                                 <div className="flex justify-between items-end text-xs">
//                                     {config.showSignature && watchedValues.signatureUrl && (
//                                         <div className="text-center">
//                                             <img
//                                                 src={watchedValues.signatureUrl}
//                                                 alt="Signature"
//                                                 className="h-6 sm:h-8 w-auto mb-1"
//                                             />
//                                             <div className="border-t pt-1">
//                                                 <p>Authorized Signature</p>
//                                             </div>
//                                         </div>
//                                     )}
//                                     {config.showStamp && watchedValues.stampUrl && (
//                                         <img
//                                             src={watchedValues.stampUrl}
//                                             alt="Stamp"
//                                             className="h-8 sm:h-12 w-auto"
//                                         />
//                                     )}
//                                 </div>

//                                 {watchedValues.footerText && (
//                                     <p className="text-center text-xs mt-2">
//                                         {watchedValues.footerText}
//                                     </p>
//                                 )}
//                             </div>
//                         </CardContent>
//                     </Card>
//                 </div>
//             </div>
//         </div>
//     );
// }

'use client';

import { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
    Save,
    Loader2,
    Award,
    CreditCard,
    FileText,
    Eye,
    Image as ImageIcon,
    Type,
    Layout,
    AlertCircle,
    Plus,
    Trash2,
    Copy,
    Table,
    Undo,
    Redo
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import FileUploadButton from '@/components/fileupload';
import CropImageDialog from '@/app/components/CropImageDialog';
import { uploadFiles } from '@/app/components/utils/uploadThing';

const formSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    description: z.string().optional(),
    type: z.string(),
    isDefault: z.boolean().default(false),
    backgroundColor: z.string().default('#FFFFFF'),
    primaryColor: z.string().default('#1e40af'),
    secondaryColor: z.string().default('#64748b'),
    borderColor: z.string().default('#000000'),
    borderWidth: z.number().min(0).max(20).default(2),
    fontSize: z.number().min(8).max(72).default(14),
    fontFamily: z.string().default('Arial'),
    textColor: z.string().default('#000000'),
    headerText: z.string().default(''),
    footerText: z.string().default(''),
    logoUrl: z.string().optional(),
    signatureUrl: z.string().optional(),
    stampUrl: z.string().optional(),
    backgroundImage: z.string().optional(),
    includeQRCode: z.boolean().default(false),
    includeBarcode: z.boolean().default(false),
    includePhoto: z.boolean().default(false),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
});

const TEMPLATE_CONFIGS = {
    certificate: {
        title: 'Certificate Template',
        icon: Award,
        apiEndpoint: 'certificate-templates',
        backUrl: '/dashboard/documents/templates/certificate',
        types: [
            { value: 'character', label: 'Character Certificate' },
            { value: 'bonafide', label: 'Bonafide Certificate' },
            { value: 'transfer', label: 'Transfer Certificate' },
            { value: 'completion', label: 'Course Completion' },
            { value: 'participation', label: 'Participation' },
            { value: 'achievement', label: 'Achievement' },
        ],
        defaultType: 'character',
        previewAspect: '1/1.414',
        showSignature: true,
        showStamp: true,
        showQR: false,
        showPhoto: false,
    },
    idcard: {
        title: 'ID Card Template',
        icon: CreditCard,
        apiEndpoint: 'idcard-templates',
        backUrl: '/dashboard/documents/templates/id-card',
        types: [
            { value: 'student', label: 'Student ID' },
            { value: 'teacher', label: 'Teacher ID' },
            { value: 'staff', label: 'Staff ID' },
            { value: 'visitor', label: 'Visitor Pass' },
        ],
        defaultType: 'student',
        previewAspect: '0.63/1',
        showSignature: false,
        showStamp: false,
        showQR: true,
        showPhoto: true,
    },
    admitcard: {
        title: 'Admit Card Template',
        icon: FileText,
        apiEndpoint: 'admitcard-templates',
        backUrl: '/dashboard/documents/templates/admit-cards',
        types: [
            { value: 'midterm', label: 'Mid-term Exam' },
            { value: 'final', label: 'Final Exam' },
            { value: 'quarterly', label: 'Quarterly Exam' },
            { value: 'annual', label: 'Annual Exam' },
            { value: 'entrance', label: 'Entrance Test' },
        ],
        defaultType: 'midterm',
        previewAspect: '1/1.414',
        showSignature: true,
        showStamp: true,
        showQR: true,
        showPhoto: true,
        useDragDrop: true, // Enable drag and drop for admit cards
    },
};

const ELEMENT_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    TABLE: 'table',
};

const DEFAULT_ADMIT_CARD_ELEMENTS = [
    {
        id: 'header-1',
        type: ELEMENT_TYPES.TEXT,
        content: 'BOARD OF SECONDARY EDUCATION, MADHYA PRADESH, BHOPAL',
        x: 150,
        y: 20,
        width: 700,
        height: 40,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#000000'
    },
    {
        id: 'logo-left',
        type: ELEMENT_TYPES.IMAGE,
        url: '',
        x: 30,
        y: 15,
        width: 80,
        height: 80
    },
    {
        id: 'logo-right',
        type: ELEMENT_TYPES.IMAGE,
        url: '',
        x: 890,
        y: 15,
        width: 80,
        height: 80
    },
    {
        id: 'title',
        type: ELEMENT_TYPES.TEXT,
        content: 'HIGHER SECONDARY SCHOOL CERTIFICATE EXAMINATION (10+2) 2014',
        x: 150,
        y: 80,
        width: 700,
        height: 30,
        fontSize: 16,
        fontWeight: 'normal',
        textAlign: 'center',
        color: '#000000',
        textDecoration: 'underline'
    },
    {
        id: 'exam-session',
        type: ELEMENT_TYPES.TEXT,
        content: 'May-June {{year}} Examinations',
        x: 350,
        y: 120,
        width: 300,
        height: 25,
        fontSize: 13,
        textAlign: 'center',
        color: '#000000'
    },
    {
        id: 'info-table',
        type: ELEMENT_TYPES.TABLE,
        x: 30,
        y: 160,
        width: 650,
        columns: [
            { label: 'ROLL NUMBER', width: '50%' },
            { label: 'ADMISSION NO', width: '50%' }
        ],
        rows: [
            [{ label: 'ROLL NUMBER', field: '{{rollNumber}}' }, { label: 'ADMISSION NO', field: '{{admissionNo}}' }],
            [{ label: "CANDIDATE'S NAME", field: '{{studentName}}', colspan: 1 }, { label: 'CLASS', field: '{{class}}', colspan: 1 }],
            [{ label: 'D.O.B', field: '{{dob}}' }, { label: 'GENDER', field: '{{gender}}' }],
            [{ label: 'FATHERS NAME', field: '{{fatherName}}' }, { label: 'MOTHERS NAME', field: '{{motherName}}' }],
            [{ label: 'ADDRESS', field: '{{address}}', colspan: 2 }],
            [{ label: 'SCHOOL NAME', field: '{{schoolName}}', colspan: 2 }],
            [{ label: 'EXAM CENTER', field: '{{examCenter}}', colspan: 2 }]
        ],
        borderWidth: 1,
        borderColor: '#000000',
        headerBg: '#ffffff',
        cellPadding: 8
    },
    {
        id: 'photo',
        type: ELEMENT_TYPES.IMAGE,
        url: '{{studentPhoto}}',
        x: 730,
        y: 160,
        width: 120,
        height: 140,
        border: true,
        borderColor: '#000000',
        borderWidth: 2
    },
    {
        id: 'exam-schedule',
        type: ELEMENT_TYPES.TABLE,
        x: 30,
        y: 380,
        width: 940,
        columns: [
            { label: 'THEORY EXAM DATE & TIME', width: '35%' },
            { label: 'PAPER CODE', width: '15%' },
            { label: 'SUBJECT', width: '30%' },
            { label: 'OPTED BY STUDENT', width: '20%' }
        ],
        rows: [
            ['{{examDate1}}', '{{paperCode1}}', '{{subject1}}', '{{opted1}}'],
            ['{{examDate2}}', '{{paperCode2}}', '{{subject2}}', '{{opted2}}'],
            ['{{examDate3}}', '{{paperCode3}}', '{{subject3}}', '{{opted3}}'],
            ['{{examDate4}}', '{{paperCode4}}', '{{subject4}}', '{{opted4}}']
        ],
        borderWidth: 1,
        borderColor: '#000000',
        headerBg: '#ffffff',
        cellPadding: 6
    },
    {
        id: 'signature',
        type: ELEMENT_TYPES.IMAGE,
        url: '',
        x: 770,
        y: 550,
        width: 120,
        height: 50
    }
];

export default function CreateTemplatePage() {
    const router = useRouter();
    const params = useParams();
    const [resetKeys, setResetKeys] = useState({
        logo: 0,
        signature: 0,
        stamp: 0,
        background: 0,
    });
    const [uploading, setUploading] = useState(false);
    const [rawImage, setRawImage] = useState(null);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [currentField, setCurrentField] = useState(null);
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    // Drag and drop state for admit cards
    const [elements, setElements] = useState(DEFAULT_ADMIT_CARD_ELEMENTS);
    const [selectedElement, setSelectedElement] = useState(null);
    const [dragging, setDragging] = useState(null);
    const [history, setHistory] = useState([DEFAULT_ADMIT_CARD_ELEMENTS]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const canvasRef = useRef(null);

    const templateType = params?.type;
    const config = TEMPLATE_CONFIGS[templateType];

    if (!templateType || !config) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-6 w-6" />
                            <CardTitle className="text-xl">Invalid Template Type</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                The template type "<strong>{params?.type || 'unknown'}</strong>" is not recognized.
                            </AlertDescription>
                        </Alert>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button onClick={() => router.push('/dashboard/documents/templates/certificate')} variant="outline" className="flex-1">
                                <Award className="mr-2 h-4 w-4" />
                                Certificates
                            </Button>
                            <Button onClick={() => router.push('/dashboard/documents/templates/id-card')} variant="outline" className="flex-1">
                                <CreditCard className="mr-2 h-4 w-4" />
                                ID Cards
                            </Button>
                            <Button onClick={() => router.push('/dashboard/documents/templates/admit-cards')} variant="outline" className="flex-1">
                                <FileText className="mr-2 h-4 w-4" />
                                Admit Cards
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const Icon = config.icon;

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            description: '',
            type: config.defaultType,
            isDefault: false,
            backgroundColor: '#FFFFFF',
            primaryColor: '#1e40af',
            secondaryColor: '#64748b',
            borderColor: '#000000',
            borderWidth: 2,
            fontSize: 14,
            fontFamily: 'Arial',
            textColor: '#000000',
            headerText: '',
            footerText: '',
            includeQRCode: config.showQR,
            includeBarcode: false,
            includePhoto: config.showPhoto,
            orientation: 'portrait',
        },
    });

    const watchedValues = watch();

    // Drag and drop functions
    const addToHistory = (newElements) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newElements)));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setElements(JSON.parse(JSON.stringify(history[historyIndex - 1])));
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setElements(JSON.parse(JSON.stringify(history[historyIndex + 1])));
        }
    };

    const addElement = (type) => {
        const newElement = {
            id: `${type}-${Date.now()}`,
            type,
            x: 100,
            y: 100,
            ...(type === ELEMENT_TYPES.TEXT && {
                content: 'New Text',
                width: 200,
                height: 40,
                fontSize: 14,
                fontWeight: 'normal',
                textAlign: 'left',
                color: '#000000'
            }),
            ...(type === ELEMENT_TYPES.IMAGE && {
                url: '',
                width: 100,
                height: 100
            }),
            ...(type === ELEMENT_TYPES.TABLE && {
                width: 600,
                columns: [
                    { label: 'Column 1', width: '50%' },
                    { label: 'Column 2', width: '50%' }
                ],
                rows: [
                    [{ label: 'Field 1', field: '{{value1}}' }, { label: 'Field 2', field: '{{value2}}' }]
                ],
                borderWidth: 1,
                borderColor: '#000000',
                cellPadding: 6
            })
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        addToHistory(newElements);
        setSelectedElement(newElement.id);
    };

    const updateElement = (id, updates) => {
        const newElements = elements.map(el =>
            el.id === id ? { ...el, ...updates } : el
        );
        setElements(newElements);
    };

    const updateElementAndHistory = (id, updates) => {
        const newElements = elements.map(el =>
            el.id === id ? { ...el, ...updates } : el
        );
        setElements(newElements);
        addToHistory(newElements);
    };

    const deleteElement = (id) => {
        const newElements = elements.filter(el => el.id !== id);
        setElements(newElements);
        addToHistory(newElements);
        setSelectedElement(null);
    };

    const duplicateElement = (id) => {
        const element = elements.find(el => el.id === id);
        if (!element) return;

        const newElement = {
            ...JSON.parse(JSON.stringify(element)),
            id: `${element.type}-${Date.now()}`,
            x: element.x + 20,
            y: element.y + 20
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        addToHistory(newElements);
        setSelectedElement(newElement.id);
    };

    const handleMouseDown = (e, element) => {
        if (e.target.closest('.no-drag')) return;
        const rect = canvasRef.current.getBoundingClientRect();
        setDragging({
            id: element.id,
            startX: e.clientX - rect.left - element.x,
            startY: e.clientY - rect.top - element.y
        });
        setSelectedElement(element.id);
    };

    const handleMouseMove = (e) => {
        if (!dragging) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const newX = Math.max(0, Math.min(e.clientX - rect.left - dragging.startX, 1000 - 50));
        const newY = Math.max(0, Math.min(e.clientY - rect.top - dragging.startY, 700 - 50));
        updateElement(dragging.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
        if (dragging) {
            addToHistory(elements);
            setDragging(null);
        }
    };

    const handleElementImageUpload = (elementId, previewUrl) => {
        if (!previewUrl) return;
        setCurrentField(elementId);
        setRawImage(previewUrl);
        setCropDialogOpen(true);
    };

    const renderElement = (element) => {
        const isSelected = selectedElement === element.id;

        const baseStyle = {
            position: 'absolute',
            left: `${element.x}px`,
            top: `${element.y}px`,
            cursor: dragging ? 'grabbing' : 'grab',
            border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
            outline: isSelected ? '2px solid rgba(59, 130, 246, 0.2)' : 'none',
            outlineOffset: '2px',
            zIndex: isSelected ? 10 : 1
        };

        switch (element.type) {
            case ELEMENT_TYPES.TEXT:
                return (
                    <div
                        key={element.id}
                        style={{
                            ...baseStyle,
                            width: `${element.width}px`,
                            minHeight: `${element.height}px`,
                            fontSize: `${element.fontSize}px`,
                            fontWeight: element.fontWeight,
                            textAlign: element.textAlign,
                            color: element.color,
                            padding: '4px',
                            wordWrap: 'break-word',
                            ...(element.textDecoration && { textDecoration: element.textDecoration })
                        }}
                        onMouseDown={(e) => handleMouseDown(e, element)}
                    >
                        {element.content}
                    </div>
                );

            case ELEMENT_TYPES.IMAGE:
                return (
                    <div
                        key={element.id}
                        style={{
                            ...baseStyle,
                            width: `${element.width}px`,
                            height: `${element.height}px`,
                            backgroundColor: element.url ? 'transparent' : '#f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            ...(element.border && {
                                border: `${element.borderWidth || 2}px solid ${element.borderColor || '#000'}`
                            })
                        }}
                        onMouseDown={(e) => handleMouseDown(e, element)}
                    >
                        {element.url && !element.url.startsWith('{{') ? (
                            <img
                                src={element.url}
                                alt="Template element"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div className="text-center">
                                <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                <span className="text-xs text-gray-500">
                                    {element.url?.startsWith('{{') ? element.url : 'Image'}
                                </span>
                            </div>
                        )}
                    </div>
                );

            case ELEMENT_TYPES.TABLE:
                return (
                    <div
                        key={element.id}
                        style={{
                            ...baseStyle,
                            width: `${element.width}px`
                        }}
                        onMouseDown={(e) => handleMouseDown(e, element)}
                    >
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '10px',
                            backgroundColor: '#fff'
                        }}>
                            {element.columns && (
                                <thead>
                                    <tr>
                                        {element.columns.map((col, idx) => (
                                            <th
                                                key={idx}
                                                style={{
                                                    border: `${element.borderWidth || 1}px solid ${element.borderColor || '#000'}`,
                                                    padding: `${element.cellPadding || 6}px`,
                                                    fontWeight: 'bold',
                                                    color:'black',
                                                    backgroundColor: element.headerBg || '#f5f5f5',
                                                    width: col.width || 'auto',
                                                    textAlign: 'left',
                                                    fontSize: '11px'
                                                }}
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                            )}
                            <tbody>
                                {element.rows?.map((row, rowIdx) => (
                                    <tr key={rowIdx}>
                                        {Array.isArray(row) ? (
                                            row.map((cell, cellIdx) => {
                                                const isObject = typeof cell === 'object';
                                                const content = isObject ? (cell.label || cell.field) : cell;
                                                const colspan = isObject && cell.colspan ? cell.colspan : 1;
                                                const isBold = isObject && cell.label;

                                                return (
                                                    <td
                                                        key={cellIdx}
                                                        colSpan={colspan}
                                                        style={{
                                                            border: `${element.borderWidth || 1}px solid ${element.borderColor || '#000'}`,
                                                            padding: `${element.cellPadding || 6}px`,
                                                            fontWeight: isBold ? 'bold' : 'normal',
                                                            fontSize: '10px',
                                                            color:'black',
                                                        }}
                                                    >
                                                        {content}
                                                    </td>
                                                );
                                            })
                                        ) : null}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );

            default:
                return null;
        }
    };

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const layoutConfig = {
                backgroundColor: data.backgroundColor,
                primaryColor: data.primaryColor,
                secondaryColor: data.secondaryColor,
                borderColor: data.borderColor,
                borderWidth: data.borderWidth,
                fontSize: data.fontSize,
                fontFamily: data.fontFamily,
                textColor: data.textColor,
                headerText: data.headerText,
                footerText: data.footerText,
                logoUrl: data.logoUrl,
                signatureUrl: data.signatureUrl,
                stampUrl: data.stampUrl,
                backgroundImage: data.backgroundImage,
                includeQRCode: data.includeQRCode,
                includeBarcode: data.includeBarcode,
                includePhoto: data.includePhoto,
                orientation: data.orientation,
                ...(config.useDragDrop && { elements }) // Add elements for admit cards
            };

            const res = await fetch(`/api/documents/${schoolId}/${config.apiEndpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    description: data.description,
                    type: data.type,
                    isDefault: data.isDefault,
                    layoutConfig,
                    createdById: fullUser?.id,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create template');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Template created successfully');
            router.push(config.backUrl);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create template');
        },
    });

    const handleImageUpload = (field, previewUrl) => {
        if (!previewUrl || previewUrl === rawImage) return;
        setCurrentField(field);
        setRawImage(previewUrl);
        setCropDialogOpen(true);
    };

    const onSubmit = (data) => {
        createMutation.mutate(data);
    };

    if (!schoolId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const selectedEl = elements.find(el => el.id === selectedElement);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {cropDialogOpen && rawImage && currentField && (
                <CropImageDialog
                    image={rawImage}
                    onClose={() => { if (!uploading) setCropDialogOpen(false); }}
                    uploading={uploading}
                    open={cropDialogOpen}
                    onCropComplete={async (croppedBlob) => {
                        const now = new Date();
                        const iso = now.toISOString().replace(/[:.]/g, "-");
                        const perf = Math.floor(performance.now() * 1000);
                        const timestamp = `${iso}-${perf}`;
                        const filename = `${timestamp}.jpg`;
                        const file = new File([croppedBlob], filename, { type: "image/jpeg" });
                        try {
                            setUploading(true);
                            const res = await uploadFiles("logoupload", { files: [file] });
                            if (res && res[0]?.url) {
                                // Check if it's for an element or form field
                                if (elements.find(el => el.id === currentField)) {
                                    updateElementAndHistory(currentField, { url: res[0].ufsUrl });
                                } else {
                                    setValue(currentField, res[0].ufsUrl);
                                }
                                toast.success("Image uploaded successfully!");
                            } else {
                                toast.error("Upload failed");
                            }
                        } catch (err) {
                            toast.error("Something went wrong during upload");
                            console.error(err);
                        } finally {
                            setUploading(false);
                            setCropDialogOpen(false);
                            setCurrentField(null);
                            setRawImage(null);
                        }
                    }}
                />
            )}

            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
                            <span>Create {config.title}</span>
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground ml-10 sm:ml-12">
                        Design a new {config.title.toLowerCase()} for your school
                    </p>
                </div>
                <div className="flex gap-2">
                    {config.useDragDrop && (
                        <>
                            <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex === 0}>
                                <Undo className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex === history.length - 1}>
                                <Redo className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                    <Button
                        onClick={handleSubmit(onSubmit)}
                        disabled={createMutation.isPending || uploading}
                        size="sm"
                    >
                        {createMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Template
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Form Section */}
                <div className="space-y-4">
                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className={`grid w-full ${config.useDragDrop ? 'grid-cols-4' : 'grid-cols-3'}`}>
                            <TabsTrigger value="basic" className="text-xs sm:text-sm">
                                <Type className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                Basic
                            </TabsTrigger>
                            <TabsTrigger value="design" className="text-xs sm:text-sm">
                                <Layout className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                Design
                            </TabsTrigger>
                            <TabsTrigger value="assets" className="text-xs sm:text-sm">
                                <ImageIcon className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                Assets
                            </TabsTrigger>
                            {config.useDragDrop && (
                                <TabsTrigger value="builder" className="text-xs sm:text-sm">
                                    <Layout className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    Builder
                                </TabsTrigger>
                            )}
                        </TabsList>

                        {/* Basic Info Tab */}
                        <TabsContent value="basic" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base sm:text-lg">Basic Information</CardTitle>
                                    <CardDescription className="text-xs sm:text-sm">
                                        Enter the template details
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm">Template Name *</Label>
                                        <Input
                                            id="name"
                                            {...register('name')}
                                            placeholder={`e.g., ${config.title} 2024`}
                                            className="text-sm"
                                        />
                                        {errors.name && (
                                            <p className="text-xs text-red-500">{errors.name.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description" className="text-sm">Description</Label>
                                        <Textarea
                                            id="description"
                                            {...register('description')}
                                            placeholder="Brief description of this template"
                                            rows={3}
                                            className="text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="type" className="text-sm">Type *</Label>
                                        <Select
                                            value={watchedValues.type}
                                            onValueChange={(value) => setValue('type', value)}
                                        >
                                            <SelectTrigger className="text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {config.types.map((type) => (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        {type.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {templateType !== 'certificate' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="orientation" className="text-sm">Orientation</Label>
                                            <Select
                                                value={watchedValues.orientation}
                                                onValueChange={(value) => setValue('orientation', value)}
                                            >
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="portrait">Portrait</SelectItem>
                                                    <SelectItem value="landscape">Landscape</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between py-2">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="isDefault" className="text-sm">Set as Default</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Use this template by default for this type
                                            </p>
                                        </div>
                                        <Switch
                                            id="isDefault"
                                            checked={watchedValues.isDefault}
                                            onCheckedChange={(checked) => setValue('isDefault', checked)}
                                        />
                                    </div>

                                    {config.showQR && (
                                        <div className="flex items-center justify-between py-2">
                                            <Label htmlFor="includeQRCode" className="text-sm">Include QR Code</Label>
                                            <Switch
                                                id="includeQRCode"
                                                checked={watchedValues.includeQRCode}
                                                onCheckedChange={(checked) => setValue('includeQRCode', checked)}
                                            />
                                        </div>
                                    )}

                                    {config.showPhoto && (
                                        <div className="flex items-center justify-between py-2">
                                            <Label htmlFor="includePhoto" className="text-sm">Include Photo</Label>
                                            <Switch
                                                id="includePhoto"
                                                checked={watchedValues.includePhoto}
                                                onCheckedChange={(checked) => setValue('includePhoto', checked)}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Design Tab */}
                        <TabsContent value="design" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base sm:text-lg">Design Settings</CardTitle>
                                    <CardDescription className="text-xs sm:text-sm">
                                        Customize the appearance
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="backgroundColor" className="text-sm">Background</Label>
                                            <Input
                                                id="backgroundColor"
                                                type="color"
                                                {...register('backgroundColor')}
                                                className="h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="primaryColor" className="text-sm">Primary Color</Label>
                                            <Input
                                                id="primaryColor"
                                                type="color"
                                                {...register('primaryColor')}
                                                className="h-10"
                                            />
                                        </div>
                                    </div>

                                    {templateType === 'certificate' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="borderColor" className="text-sm">Border Color</Label>
                                                <Input
                                                    id="borderColor"
                                                    type="color"
                                                    {...register('borderColor')}
                                                    className="h-10"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="borderWidth" className="text-sm">Border Width (px)</Label>
                                                <Input
                                                    id="borderWidth"
                                                    type="number"
                                                    {...register('borderWidth', { valueAsNumber: true })}
                                                    min="0"
                                                    max="20"
                                                    className="text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="fontFamily" className="text-sm">Font Family</Label>
                                        <Select
                                            value={watchedValues.fontFamily}
                                            onValueChange={(value) => setValue('fontFamily', value)}
                                        >
                                            <SelectTrigger className="text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Arial">Arial</SelectItem>
                                                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                                <SelectItem value="Georgia">Georgia</SelectItem>
                                                <SelectItem value="Courier New">Courier New</SelectItem>
                                                <SelectItem value="Verdana">Verdana</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="fontSize" className="text-sm">Font Size (px)</Label>
                                            <Input
                                                id="fontSize"
                                                type="number"
                                                {...register('fontSize', { valueAsNumber: true })}
                                                min="8"
                                                max="72"
                                                className="text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="textColor" className="text-sm">Text Color</Label>
                                            <Input
                                                id="textColor"
                                                type="color"
                                                {...register('textColor')}
                                                className="h-10"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="headerText" className="text-sm">Header Text</Label>
                                        <Input
                                            id="headerText"
                                            {...register('headerText')}
                                            placeholder="e.g., School Name"
                                            className="text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="footerText" className="text-sm">Footer Text</Label>
                                        <Input
                                            id="footerText"
                                            {...register('footerText')}
                                            placeholder="e.g., Authorized Signature"
                                            className="text-sm"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Assets Tab */}
                        <TabsContent value="assets" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base sm:text-lg">Assets & Images</CardTitle>
                                    <CardDescription className="text-xs sm:text-sm">
                                        Upload logos, signatures, and stamps
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm">School Logo</Label>
                                        <FileUploadButton
                                            onChange={(previewUrl) => handleImageUpload('logoUrl', previewUrl)}
                                            resetKey={resetKeys.logo}
                                            disabled={uploading}
                                        />
                                        {watchedValues.logoUrl && (
                                            <div className="mt-2">
                                                <img
                                                    src={watchedValues.logoUrl}
                                                    alt="Logo"
                                                    className="h-20 w-auto border rounded"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {config.showSignature && (
                                        <div className="space-y-2">
                                            <Label className="text-sm">Signature</Label>
                                            <FileUploadButton
                                                onChange={(previewUrl) => handleImageUpload('signatureUrl', previewUrl)}
                                                resetKey={resetKeys.signature}
                                                disabled={uploading}
                                            />
                                            {watchedValues.signatureUrl && (
                                                <div className="mt-2">
                                                    <img
                                                        src={watchedValues.signatureUrl}
                                                        alt="Signature"
                                                        className="h-20 w-auto border rounded"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {config.showStamp && (
                                        <div className="space-y-2">
                                            <Label className="text-sm">Stamp/Seal</Label>
                                            <FileUploadButton
                                                onChange={(previewUrl) => handleImageUpload('stampUrl', previewUrl)}
                                                resetKey={resetKeys.stamp}
                                                disabled={uploading}
                                            />
                                            {watchedValues.stampUrl && (
                                                <div className="mt-2">
                                                    <img
                                                        src={watchedValues.stampUrl}
                                                        alt="Stamp"
                                                        className="h-20 w-auto border rounded"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-sm">Background Image (Optional)</Label>
                                        <FileUploadButton
                                            onChange={(previewUrl) => handleImageUpload('backgroundImage', previewUrl)}
                                            resetKey={resetKeys.background}
                                            disabled={uploading}
                                        />
                                        {watchedValues.backgroundImage && (
                                            <div className="mt-2">
                                                <img
                                                    src={watchedValues.backgroundImage}
                                                    alt="Background"
                                                    className="h-20 w-auto border rounded"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Builder Tab - Only for Admit Cards */}
                        {config.useDragDrop && (
                            <TabsContent value="builder" className="space-y-4 mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base sm:text-lg">Add Elements</CardTitle>
                                        <CardDescription className="text-xs sm:text-sm">
                                            Add text, images, and tables to your template
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <Button onClick={() => addElement(ELEMENT_TYPES.TEXT)} variant="outline" className="w-full justify-start" size="sm">
                                            <Type className="mr-2 h-4 w-4" />
                                            Add Text
                                        </Button>

                                        <Button onClick={() => addElement(ELEMENT_TYPES.IMAGE)} variant="outline" className="w-full justify-start" size="sm">
                                            <ImageIcon className="mr-2 h-4 w-4" />
                                            Add Image
                                        </Button>

                                        <Button onClick={() => addElement(ELEMENT_TYPES.TABLE)} variant="outline" className="w-full justify-start" size="sm">
                                            <Table className="mr-2 h-4 w-4" />
                                            Add Table
                                        </Button>
                                    </CardContent>
                                </Card>

                                {selectedEl && (
                                    <Card>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-base sm:text-lg">Element Properties</CardTitle>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => duplicateElement(selectedEl.id)}
                                                        className="h-7 w-7 p-0"
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => deleteElement(selectedEl.id)}
                                                        className="h-7 w-7 p-0 text-red-500"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">X</Label>
                                                    <Input
                                                        type="number"
                                                        value={selectedEl.x}
                                                        onChange={(e) => updateElementAndHistory(selectedEl.id, { x: parseInt(e.target.value) || 0 })}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-xs">Y</Label>
                                                    <Input
                                                        type="number"
                                                        value={selectedEl.y}
                                                        onChange={(e) => updateElementAndHistory(selectedEl.id, { y: parseInt(e.target.value) || 0 })}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-xs">Width</Label>
                                                    <Input
                                                        type="number"
                                                        value={selectedEl.width}
                                                        onChange={(e) => updateElementAndHistory(selectedEl.id, { width: parseInt(e.target.value) || 100 })}
                                                        className="h-8 text-xs"
                                                    />
                                                </div>

                                                {selectedEl.type !== ELEMENT_TYPES.TABLE && (
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Height</Label>
                                                        <Input
                                                            type="number"
                                                            value={selectedEl.height}
                                                            onChange={(e) => updateElementAndHistory(selectedEl.id, { height: parseInt(e.target.value) || 40 })}
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {selectedEl.type === ELEMENT_TYPES.TEXT && (
                                                <>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Content</Label>
                                                        <Textarea
                                                            value={selectedEl.content}
                                                            onChange={(e) => updateElementAndHistory(selectedEl.id, { content: e.target.value })}
                                                            rows={2}
                                                            className="text-xs"
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            Use {'{{'} {'}'} for dynamic fields, e.g., {'{{studentName}}'}
                                                        </p>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Font Size</Label>
                                                            <Input
                                                                type="number"
                                                                value={selectedEl.fontSize}
                                                                onChange={(e) => updateElementAndHistory(selectedEl.id, { fontSize: parseInt(e.target.value) || 14 })}
                                                                className="h-8 text-xs"
                                                            />
                                                        </div>

                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Weight</Label>
                                                            <Select
                                                                value={selectedEl.fontWeight}
                                                                onValueChange={(value) => updateElementAndHistory(selectedEl.id, { fontWeight: value })}
                                                            >
                                                                <SelectTrigger className="h-8 text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="normal">Normal</SelectItem>
                                                                    <SelectItem value="bold">Bold</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Text Align</Label>
                                                        <Select
                                                            value={selectedEl.textAlign}
                                                            onValueChange={(value) => updateElementAndHistory(selectedEl.id, { textAlign: value })}
                                                        >
                                                            <SelectTrigger className="h-8 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="left">Left</SelectItem>
                                                                <SelectItem value="center">Center</SelectItem>
                                                                <SelectItem value="right">Right</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Color</Label>
                                                        <Input
                                                            type="color"
                                                            value={selectedEl.color}
                                                            onChange={(e) => updateElementAndHistory(selectedEl.id, { color: e.target.value })}
                                                            className="h-8"
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {selectedEl.type === ELEMENT_TYPES.IMAGE && (
                                                <>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Image URL or Field</Label>
                                                        <Input
                                                            value={selectedEl.url}
                                                            onChange={(e) => updateElementAndHistory(selectedEl.id, { url: e.target.value })}
                                                            placeholder="URL or {{field}}"
                                                            className="h-8 text-xs"
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            Use {'{{studentPhoto}}'} for dynamic images
                                                        </p>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Or Upload Image</Label>
                                                        <FileUploadButton
                                                            onChange={(previewUrl) => handleElementImageUpload(selectedEl.id, previewUrl)}
                                                            disabled={uploading}
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs">Show Border</Label>
                                                        <Switch
                                                            checked={selectedEl.border || false}
                                                            onCheckedChange={(checked) => updateElementAndHistory(selectedEl.id, { border: checked })}
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            {selectedEl.type === ELEMENT_TYPES.TABLE && (
                                                <>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Border Width</Label>
                                                        <Input
                                                            type="number"
                                                            value={selectedEl.borderWidth}
                                                            onChange={(e) => updateElementAndHistory(selectedEl.id, { borderWidth: parseInt(e.target.value) || 1 })}
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Border Color</Label>
                                                        <Input
                                                            type="color"
                                                            value={selectedEl.borderColor}
                                                            onChange={(e) => updateElementAndHistory(selectedEl.id, { borderColor: e.target.value })}
                                                            className="h-8"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Cell Padding (px)</Label>
                                                        <Input
                                                            type="number"
                                                            value={selectedEl.cellPadding || 6}
                                                            onChange={(e) => updateElementAndHistory(selectedEl.id, { cellPadding: parseInt(e.target.value) || 6 })}
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>

                                                    <Alert>
                                                        <AlertCircle className="h-3 w-3" />
                                                        <AlertDescription className="text-xs">
                                                            Table structure can be edited in the code. Use {'{{'} {'}'} for dynamic values.
                                                        </AlertDescription>
                                                    </Alert>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Elements List</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1 max-h-60 overflow-y-auto">
                                        {elements.map((el) => (
                                            <div
                                                key={el.id}
                                                className={`flex items-center justify-between p-2 rounded-lg border-muted text-xs cursor-pointer hover:bg-gray-100 hover:text-black ${selectedElement === el.id ? 'bg-white text-black border rounded-lg border-muted' : ''
                                                    }`}
                                                onClick={() => setSelectedElement(el.id)}
                                            >
                                                <span className="truncate flex-1">
                                                    {el.type === ELEMENT_TYPES.TEXT && <Type className="w-3 h-3 inline mr-1" />}
                                                    {el.type === ELEMENT_TYPES.IMAGE && <ImageIcon className="w-3 h-3 inline mr-1" />}
                                                    {el.type === ELEMENT_TYPES.TABLE && <Table className="w-3 h-3 inline mr-1" />}
                                                    {el.id}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteElement(el.id);
                                                    }}
                                                    className="h-6 w-6 p-0 ml-2"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )}
                    </Tabs>
                </div>

                {/* Preview Section */}
                <div className="lg:sticky lg:top-4 lg:self-start">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                Live Preview
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                {config.useDragDrop ? 'Drag elements to reposition them' : `Preview how your ${templateType} will look`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {config.useDragDrop ? (
                                <div
                                    ref={canvasRef}
                                    className="relative border-2 rounded-lg overflow-hidden"
                                    style={{
                                        width: '100%',
                                        height: '700px',
                                        backgroundColor: watchedValues.backgroundColor,
                                    }}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                >
                                    {elements.map(renderElement)}

                                </div>
                            ) : (
                                <div
                                    className="border-2 rounded-lg p-4 sm:p-6 flex flex-col justify-between"
                                    style={{
                                        aspectRatio: config.previewAspect,
                                        backgroundColor: watchedValues.backgroundColor,
                                        borderColor: templateType === 'certificate' ? watchedValues.borderColor : watchedValues.primaryColor,
                                        borderWidth: `${watchedValues.borderWidth || 2}px`,
                                        color: watchedValues.textColor,
                                        fontFamily: watchedValues.fontFamily,
                                        backgroundImage: watchedValues.backgroundImage ? `url(${watchedValues.backgroundImage})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                    }}
                                >
                                    {/* Header */}
                                    <div className="text-center space-y-2">
                                        {watchedValues.logoUrl && (
                                            <img
                                                src={watchedValues.logoUrl}
                                                alt="Logo"
                                                className="h-8 sm:h-12 w-auto mx-auto"
                                            />
                                        )}
                                        {watchedValues.headerText && (
                                            <h2
                                                className="text-sm sm:text-base font-bold"
                                                style={{ color: watchedValues.primaryColor }}
                                            >
                                                {watchedValues.headerText}
                                            </h2>
                                        )}
                                        <h3 className="text-xs sm:text-sm font-semibold uppercase">
                                            {config.types.find(t => t.value === watchedValues.type)?.label}
                                        </h3>
                                    </div>

                                    {/* Content */}
                                    <div className="text-center space-y-2 flex-1 flex flex-col justify-center">
                                        {watchedValues.includePhoto && (
                                            <div
                                                className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full mx-auto border-2"
                                                style={{ borderColor: watchedValues.primaryColor }}
                                            />
                                        )}
                                        <p className="text-xs" style={{ fontSize: `${watchedValues.fontSize}px` }}>
                                            {templateType === 'certificate' ? 'This is to certify that' : 'Name: [Student Name]'}
                                        </p>
                                        <p className="text-sm font-bold">
                                            {templateType === 'certificate' ? '[Student Name]' : 'ID: [Student ID]'}
                                        </p>
                                        {templateType === 'idcard' && (
                                            <>
                                                <p className="text-xs">Class: [Class Name]</p>
                                                <p className="text-xs">Valid Until: [Date]</p>
                                            </>
                                        )}
                                        {templateType === 'admitcard' && !config.useDragDrop && (
                                            <>
                                                <p className="text-xs">Seat No: [Seat Number]</p>
                                                <p className="text-xs">Exam: [Exam Name]</p>
                                                <p className="text-xs">Date: [Exam Date]</p>
                                            </>
                                        )}
                                        {watchedValues.includeQRCode && (
                                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black mx-auto mt-2" />
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex justify-between items-end text-xs">
                                        {config.showSignature && watchedValues.signatureUrl && (
                                            <div className="text-center">
                                                <img
                                                    src={watchedValues.signatureUrl}
                                                    alt="Signature"
                                                    className="h-6 sm:h-8 w-auto mb-1"
                                                />
                                                <div className="border-t pt-1">
                                                    <p>Authorized Signature</p>
                                                </div>
                                            </div>
                                        )}
                                        {config.showStamp && watchedValues.stampUrl && (
                                            <img
                                                src={watchedValues.stampUrl}
                                                alt="Stamp"
                                                className="h-8 sm:h-12 w-auto"
                                            />
                                        )}
                                    </div>

                                    {watchedValues.footerText && (
                                        <p className="text-center text-xs mt-2">
                                            {watchedValues.footerText}
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
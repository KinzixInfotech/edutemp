'use client';
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
// import { useToast } from "@/components/ui/use-toast";
import { useUploadThing } from "@/app/components/utils/uploadThing";
import { useAuth } from "@/context/AuthContext";
import dynamic from "next/dynamic";
import axios from "axios";
import Link from "next/link";
import {
    Loader2, Upload, FileText, Trash2, Eye, BookOpen,
    TrendingUp, School, Calendar, Download, Filter,
    BarChart3, Users, CheckCircle2, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const PdfUploadButton = dynamic(() => import('@/components/upload'), { ssr: false });

export default function SyllabusManagement() {
    const { startUpload } = useUploadThing("syllabus");
    const { fullUser } = useAuth();
    // const { toast } = useToast();
    const queryClient = useQueryClient();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        classId: '',
        academicYearId: '',
        fileName: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [resetKey, setResetKey] = useState(0);
    const [filterClass, setFilterClass] = useState('');

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ['classes', fullUser?.schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/classes`);
            return res.data;
        },
        enabled: !!fullUser?.schoolId,
    });

    // Fetch academic years
    const { data: academicYears = [] } = useQuery({
        queryKey: ['academic-years', fullUser?.schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/academic-years?schoolId=${fullUser.schoolId}`);
            return res.data;
        },
        enabled: !!fullUser?.schoolId,
    });

    // Fetch statistics
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['syllabus-stats', fullUser?.schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/syllabus/stats?schoolId=${fullUser?.schoolId}`);
            return res.data.stats;
        },
        enabled: !!fullUser?.schoolId,
    });

    // Fetch syllabi
    const { data: syllabusData, isLoading: loading } = useQuery({
        queryKey: ['syllabi', fullUser?.schoolId, filterClass],
        queryFn: async () => {
            let url = `/api/schools/syllabus?schoolId=${fullUser?.schoolId}`;
            if (filterClass) url += `&classId=${filterClass}`;

            const res = await axios.get(url);
            return res.data;
        },
        enabled: !!fullUser?.schoolId,
    });

    const syllabi = syllabusData?.syllabi || [];

    const handleChange = (name, value) => setFormData({ ...formData, [name]: value });

    const uploadSyllabusMutation = useMutation({
        mutationFn: async () => {
            if (!selectedFile) throw new Error('Please upload a PDF file.');
            if (!formData.classId) throw new Error('Please select a class.');

            setUploading(true);

            let uploadRes;
            try {
                console.log('📤 Starting upload with file:', selectedFile.name, 'size:', selectedFile.size);
                uploadRes = await startUpload([selectedFile], {
                    schoolId: fullUser?.schoolId,
                    classId: formData?.classId,
                });
            } catch (uploadError) {
                console.error('📤 Upload error details:', uploadError);
                throw new Error(`Upload failed: ${uploadError.message || 'Network error - check your connection'}`);
            }

            console.log('📤 Upload response:', JSON.stringify(uploadRes, null, 2));

            if (!uploadRes || uploadRes.length === 0) {
                throw new Error('Upload failed - no response from server');
            }

            // Check for various URL properties that uploadthing might return
            const firstResult = uploadRes[0];
            const fileUrl = firstResult.url || firstResult.ufsUrl || firstResult.serverData?.url || firstResult.fileUrl;

            console.log('📤 First result keys:', Object.keys(firstResult));
            console.log('📤 Extracted fileUrl:', fileUrl);

            if (!fileUrl) {
                throw new Error(`Upload failed - no URL found. Keys: ${Object.keys(firstResult).join(', ')}`);
            }

            return axios.post('/api/schools/syllabus', {
                senderId: fullUser?.id,
                fileUrl: fileUrl,
                schoolId: fullUser?.schoolId,
                classId: formData?.classId,
                academicYearId: formData.academicYearId || null,
                fileName: formData.fileName || selectedFile.name,
            }).then(res => res.data);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['syllabi']);
            queryClient.invalidateQueries(['syllabus-stats']);
            toast.success("Success!", {
                description: data.message || "Syllabus uploaded successfully",
            });


            setDialogOpen(false);
            setSelectedFile(null);
            setFormData({ classId: '', academicYearId: '', fileName: '' });
            setResetKey(prev => prev + 1);
            setUploading(false);
        },
        onError: (err) => {
            toast.error("Upload Failed", {
                description: err.message || "Failed to upload syllabus",
            });
            setUploading(false);
        },
    });

    const deleteSyllabusMutation = useMutation({
        mutationFn: async (id) => axios.delete('/api/schools/syllabus', { data: { id } }),
        onSuccess: () => {
            queryClient.invalidateQueries(['syllabi']);
            queryClient.invalidateQueries(['syllabus-stats']);

            toast.success("Deleted", {
                description: "Syllabus deleted successfully",
            });

        },
        onError: () => {
            toast.error("Error", {
                description: "Failed to delete syllabus",
            });

        }
    });

    const handleSubmit = () => uploadSyllabusMutation.mutate();

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this syllabus?')) {
            deleteSyllabusMutation.mutate(id);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Syllabus Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Upload and manage syllabi for all classes
                    </p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Upload className="h-4 w-4" />
                            Upload Syllabus
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Upload Syllabus</DialogTitle>
                            <DialogDescription>
                                Upload syllabus for a specific class and academic year
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="fileName">Document Name</Label>
                                <Input
                                    id="fileName"
                                    placeholder="e.g., Mathematics Syllabus 2024"
                                    value={formData.fileName}
                                    onChange={(e) => handleChange('fileName', e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="classId">Class *</Label>
                                <Select value={formData.classId} onValueChange={(val) => handleChange('classId', val)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.length === 0 ? (
                                            <SelectItem value="loading" disabled>Loading classes...</SelectItem>
                                        ) : (
                                            classes.map(cls => (
                                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                                    {cls.className}
                                                    {cls.sections?.length > 0 &&
                                                        ` (${cls.sections.map(s => s.name).join(', ')})`
                                                    }
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="academicYearId">Academic Year</Label>
                                <Select
                                    value={formData.academicYearId}
                                    onValueChange={(val) => handleChange('academicYearId', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select academic year (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {academicYears.map((year) => (
                                            <SelectItem key={year.id} value={year.id}>
                                                {year.name || year.year} {year.isActive && '(Active)'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>PDF File *</Label>
                                <PdfUploadButton
                                    field="syllabus"
                                    onFileChange={setSelectedFile}
                                    resetKey={resetKey}
                                />
                                {selectedFile && (
                                    <p className="text-sm text-muted-foreground">
                                        Selected: {selectedFile.name}
                                    </p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                                disabled={uploading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={uploading || !selectedFile || !formData.classId}
                                className="gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4" />
                                        Upload
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </motion.div>

            {/* Statistics Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            >
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Syllabi</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats?.totalSyllabi || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    Across all classes
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Coverage</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats?.coverage || 0}%</div>
                                <p className="text-xs text-muted-foreground">
                                    {stats?.classesWithSyllabus} of {stats?.totalClasses} classes
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Academic Year</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-32" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold truncate">{stats?.academicYear}</div>
                                <p className="text-xs text-muted-foreground">Current session</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">Active</div>
                                <p className="text-xs text-muted-foreground">All systems operational</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4"
            >
                <Select value={filterClass} onValueChange={setFilterClass}>
                    <SelectTrigger className="w-full sm:w-[250px]">
                        <SelectValue placeholder="Filter by class" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {classes.map(cls => (
                            <SelectItem key={cls.id} value={cls.id.toString()}>
                                {cls.className}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </motion.div>

            {/* Syllabi Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Syllabi Library</CardTitle>
                        <CardDescription>
                            View and manage all uploaded syllabi
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Class</TableHead>
                                        <TableHead>Sections</TableHead>
                                        <TableHead>Academic Year</TableHead>
                                        <TableHead>Upload Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {loading ? (
                                            Array(5).fill(0).map((_, index) => (
                                                <TableRow key={index}>
                                                    <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : syllabi.length > 0 ? (
                                            syllabi.map((syllabus, index) => (
                                                <motion.tr
                                                    key={syllabus.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="group hover:bg-muted/50 transition-colors"
                                                >
                                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {/* <BookOpen className="h-4 w-4 text-primary" /> */}
                                                            <span className="font-medium">
                                                                {syllabus?.filename || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <BookOpen className="h-4 w-4 text-primary" />
                                                            <span className="font-medium">
                                                                {syllabus.Class?.className || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {syllabus.Class?.sections?.length > 0 ? (
                                                                syllabus.Class.sections.map(section => (
                                                                    <Badge key={section.id} variant="secondary" className="text-xs">
                                                                        {section.name}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs">All</Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {syllabus.AcademicYear?.name || 'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(syllabus.uploadedAt).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-2">
                                                            <Link
                                                                href={`${syllabus.fileUrl}`}
                                                                target="_blank"
                                                            >
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="gap-2"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                    View
                                                                </Button>
                                                            </Link>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDelete(syllabus.id)}
                                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </motion.tr>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <AlertCircle className="h-12 w-12 text-muted-foreground" />
                                                        <p className="text-muted-foreground">No syllabi found</p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setDialogOpen(true)}
                                                        >
                                                            Upload your first syllabus
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
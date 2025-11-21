'use client';
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useUploadThing } from "@/app/components/utils/uploadThing";
import dynamic from "next/dynamic";
import axios from "axios";
import Link from "next/link";
import {
    Loader2, Upload, FileText, Trash2, Eye, BookOpen,
    TrendingUp, Calendar, Filter, CheckCircle2, AlertCircle,
    Clock, Users, BarChart3, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const PdfUploadButton = dynamic(() => import('@/components/upload'), { ssr: false });

export default function HomeworkManagement() {
    const { fullUser } = useAuth();
    const { startUpload } = useUploadThing("homework");
    const queryClient = useQueryClient();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        classId: '',
        sectionId: '',
        subjectId: '',
        title: '',
        description: '',
        dueDate: '',
        fileName: ''
    });
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [resetKey, setResetKey] = useState(0);
    const [filterClass, setFilterClass] = useState('');
    const [filterModalVisible, setFilterModalVisible] = useState(false);

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ['classes', fullUser?.schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/classes`);
            return res.data;
        },
        enabled: !!fullUser?.schoolId,
    });

    // Fetch sections for selected class
    const { data: sections = [] } = useQuery({
        queryKey: ['sections', formData.classId],
        queryFn: async () => {
            const selectedClass = classes.find(c => c.id.toString() === formData.classId);
            return selectedClass?.sections || [];
        },
        enabled: !!formData.classId,
    });

    // Fetch subjects
    const { data: subjects = [] } = useQuery({
        queryKey: ['subjects', formData.classId],
        queryFn: async () => {
            if (!formData.classId) return [];
            const res = await axios.get(`/api/schools/subjects?classId=${formData.classId}`);
            return res.data;
        },
        enabled: !!formData.classId,
    });

    // Fetch statistics
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['homework-stats', fullUser?.schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/homework/stats?schoolId=${fullUser?.schoolId}`);
            return res.data.stats;
        },
        enabled: !!fullUser?.schoolId,
    });

    // Fetch homework
    const { data: homeworkData, isLoading: loading } = useQuery({
        queryKey: ['homework', fullUser?.schoolId, filterClass],
        queryFn: async () => {
            let url = `/api/schools/homework?schoolId=${fullUser?.schoolId}`;
            if (filterClass) url += `&classId=${filterClass}`;

            const res = await axios.get(url);
            return res.data;
        },
        enabled: !!fullUser?.schoolId,
    });

    const homework = homeworkData?.homework || [];

    const handleChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
        if (name === 'classId') {
            setFormData(prev => ({ ...prev, sectionId: '', subjectId: '' }));
        }
    };

    const uploadHomeworkMutation = useMutation({
        mutationFn: async () => {
            if (!formData.classId || !formData.title || !formData.description || !formData.dueDate) {
                throw new Error('Please fill all required fields');
            }

            setUploading(true);

            let fileUrl = null;
            let fileName = null;

            if (selectedFile) {
                const uploadRes = await startUpload([selectedFile], {
                    schoolId: fullUser?.schoolId,
                    classId: formData?.classId,
                });

                if (!uploadRes || !uploadRes[0].ufsUrl) throw new Error('Upload failed');

                fileUrl = uploadRes[0].ufsUrl;
                fileName = formData.fileName || selectedFile.name;
            }

            return axios.post('/api/schools/homework', {
                senderId: fullUser?.id,
                schoolId: fullUser?.schoolId,
                classId: formData?.classId,
                sectionId: formData.sectionId || null,
                subjectId: formData.subjectId || null,
                teacherId: fullUser?.id,
                title: formData.title,
                description: formData.description,
                dueDate: formData.dueDate,
                fileUrl,
                fileName
            }).then(res => res.data);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['homework']);
            queryClient.invalidateQueries(['homework-stats']);

            toast.success("Success!", {
                description: data.message || "Homework assigned successfully",
            });

            setDialogOpen(false);
            setSelectedFile(null);
            setFormData({
                classId: '',
                sectionId: '',
                subjectId: '',
                title: '',
                description: '',
                dueDate: '',
                fileName: ''
            });
            setResetKey(prev => prev + 1);
            setUploading(false);
        },
        onError: (err) => {
            toast.error("Assignment Failed", {
                description: err.message || "Failed to assign homework",
            });
            setUploading(false);
        },
    });

    const deleteHomeworkMutation = useMutation({
        mutationFn: async (id) => axios.delete('/api/schools/homework', { data: { id } }),
        onSuccess: () => {
            queryClient.invalidateQueries(['homework']);
            queryClient.invalidateQueries(['homework-stats']);
            toast.success("Deleted", {
                description: "Homework deleted successfully",
            });
        },
        onError: () => {
            toast.error("Error", {
                description: "Failed to delete homework",
            });
        }
    });

    const handleSubmit = () => uploadHomeworkMutation.mutate();
    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this homework?')) {
            deleteHomeworkMutation.mutate(id);
        }
    };

    const isOverdue = (dueDate) => new Date(dueDate) < new Date();

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Homework Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Assign and manage homework for all classes
                    </p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Upload className="h-4 w-4" />
                            Assign Homework
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Assign Homework</DialogTitle>
                            <DialogDescription>
                                Create and assign homework to students
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., Mathematics Chapter 5 Exercises"
                                    value={formData.title}
                                    onChange={(e) => handleChange('title', e.target.value)}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Provide detailed instructions..."
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    rows={4}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="sectionId">Section</Label>
                                    <Select
                                        value={formData.sectionId}
                                        onValueChange={(val) => handleChange('sectionId', val)}
                                        disabled={!formData.classId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Sections" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All Sections</SelectItem>
                                            {sections.map(sec => (
                                                <SelectItem key={sec.id} value={sec.id.toString()}>
                                                    {sec.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="subjectId">Subject</Label>
                                    <Select
                                        value={formData.subjectId}
                                        onValueChange={(val) => handleChange('subjectId', val)}
                                        disabled={!formData.classId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Subjects" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="All">All Subjects</SelectItem>
                                            {subjects.map(sub => (
                                                <SelectItem key={sub.id} value={sub.id.toString()}>
                                                    {sub.subjectName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="dueDate">Due Date *</Label>
                                    <Input
                                        id="dueDate"
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => handleChange('dueDate', e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Attachment (PDF)</Label>
                                <PdfUploadButton
                                    field="homework"
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
                                disabled={uploading || !formData.title || !formData.description || !formData.classId || !formData.dueDate}
                                className="gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Assigning...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4" />
                                        Assign Homework
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
                        <CardTitle className="text-sm font-medium">Total Homework</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats?.totalHomework || 0}</div>
                                <p className="text-xs text-muted-foreground">All assignments</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-green-600">{stats?.activeHomework || 0}</div>
                                <p className="text-xs text-muted-foreground">Not yet due</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Submission Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats?.submissions?.submissionRate || 0}%</div>
                                <p className="text-xs text-muted-foreground">
                                    {stats?.submissions?.submitted} of {stats?.submissions?.total}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Coverage</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats?.coverage || 0}%</div>
                                <p className="text-xs text-muted-foreground">
                                    {stats?.classesWithHomework} of {stats?.totalClasses} classes
                                </p>
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

            {/* Homework Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Homework Library</CardTitle>
                        <CardDescription>
                            View and manage all assigned homework
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Class</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Submissions</TableHead>
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
                                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : homework.length > 0 ? (
                                            homework.map((hw, index) => (
                                                <motion.tr
                                                    key={hw.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="group hover:bg-muted/50 transition-colors"
                                                >
                                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <BookOpen className="h-4 w-4 text-primary" />
                                                            <span className="font-medium">{hw.title}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{hw.class?.className}</div>
                                                            {hw.section && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    {hw.section.name}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {hw.subject?.subjectName || (
                                                            <span className="text-muted-foreground text-sm">All</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(hw.dueDate).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isOverdue(hw.dueDate) ? (
                                                            <Badge variant="destructive" className="text-xs">
                                                                Overdue
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="default" className="text-xs bg-green-600">
                                                                Active
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">
                                                            <div className="font-medium">
                                                                {hw.stats?.submitted || 0}/{hw.stats?.total || 0}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {hw.stats?.pending || 0} pending
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-2">
                                                            {hw.fileUrl && (
                                                                <Link
                                                                    href={hw.fileUrl}
                                                                    target="_blank"
                                                                >
                                                                    <Button size="sm" variant="outline" className="gap-2">
                                                                        <Eye className="h-4 w-4" />
                                                                        View
                                                                    </Button>
                                                                </Link>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDelete(hw.id)}
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
                                                <TableCell colSpan={8} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <AlertCircle className="h-12 w-12 text-muted-foreground" />
                                                        <p className="text-muted-foreground">No homework found</p>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setDialogOpen(true)}
                                                        >
                                                            Assign your first homework
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
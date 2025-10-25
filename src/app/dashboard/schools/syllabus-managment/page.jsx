'use client';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUploadThing } from "@/app/components/utils/uploadThing";
import { useAuth } from "@/context/AuthContext";
import dynamic from "next/dynamic";
import axios from "axios";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PdfUploadButton = dynamic(() => import('@/components/upload'), { ssr: false });

export default function SyllabusManagement() {
    const { startUpload } = useUploadThing("syllabus");
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [formData, setFormData] = useState({ classId: '', academicYearId: '' });
    const [selectedFile, setSelectedFile] = useState(null);
    const [formError, setFormError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [resetKey, setResetKey] = useState(0);

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ['classes', fullUser?.schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/classes`);
            return res.data;
        },
        enabled: !!fullUser?.schoolId,
    });

    // Fetch syllabi
    const { data: syllabi = [], isLoading: loading } = useQuery({
        queryKey: ['syllabi', fullUser?.schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/syllabus?schoolId=${fullUser?.schoolId}`);
            return res.data;
        },
        enabled: !!fullUser?.schoolId,
    });

    const handleChange = (name, value) => setFormData({ ...formData, [name]: value });

    const uploadSyllabusMutation = useMutation({
        mutationFn: async () => {
            if (!selectedFile) throw new Error('Please upload a PDF file.');
            if (!formData.classId) throw new Error('Please select a class.');

            setUploading(true);
            const uploadRes = await startUpload([selectedFile], {
                schoolId: fullUser?.schoolId,
                classId: formData?.classId,
            });

            if (!uploadRes || !uploadRes[0].ufsUrl) throw new Error('Upload failed');

            return axios.post('/api/schools/syllabus', {
                fileUrl: uploadRes[0].ufsUrl,
                schoolId: fullUser?.schoolId,
                classId: formData?.classId,
                academicYearId: formData.academicYearId || null,
            }).then(res => res.data);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['syllabi', fullUser?.schoolId]);
            setDrawerOpen(false);
            setSelectedFile(null);
            setFormData({ classId: '', academicYearId: '' });
            setResetKey(prev => prev + 1);
            setUploading(false);
        },
        onError: (err) => {
            setFormError(err.message || 'Upload failed');
            setUploading(false);
        },
    });

    const handleSubmit = () => uploadSyllabusMutation.mutate();

    const deleteSyllabusMutation = useMutation({
        mutationFn: async (id) => axios.delete('/api/schools/syllabus', { data: { id } }),
        onSuccess: () => queryClient.invalidateQueries(['syllabi', fullUser?.schoolId]),
    });

    const handleDelete = (id) => {
        if (!confirm('Are you sure you want to delete this syllabus?')) return;
        deleteSyllabusMutation.mutate(id);
    };


    return (
        <div className="p-6">
            {/* <h2 className="text-lg font-semibold mb-4">Syllabus Management</h2> */}
            <Button onClick={() => setDrawerOpen(true)} className="mb-4">Upload New Syllabus</Button>
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="bg-muted sticky top-0 z-10">
                            <TableHead>#</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Academic Year</TableHead>
                            <TableHead>Upload Date</TableHead>
                            <TableHead>File</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array(6).fill(0).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                </TableRow>
                            ))
                        ) : syllabi.length > 0 ? (
                            syllabi.map((syllabus, index) => (
                                <TableRow key={syllabus.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{syllabus.Class?.className || 'N/A'}</TableCell>
                                    <TableCell>{syllabus.AcademicYear?.name || 'N/A'}</TableCell>
                                    <TableCell>{new Date(syllabus.uploadedAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Link href={`syllabus-managment/view?url=${encodeURIComponent(syllabus.fileUrl)}`}>
                                            <Button variant="outline">View Syllabus</Button>
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(syllabus.id)}>Delete</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4">No syllabi found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>

                </Table>
            </div>

            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
                <DrawerContent className="w-[400px]">
                    <DrawerHeader>
                        <DrawerTitle>Upload Syllabus</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4">
                        {formError && <p className="text-red-500 mb-4">{formError}</p>}
                        <div className="grid gap-4">
                            <div className="flex flex-col gap-4">
                                <Label htmlFor="classId" className="text-right">Pdf Name*</Label>
                                <Input placeholder="Name" />
                            </div>
                            <div className="flex flex-col gap-4">
                                <Label htmlFor="classId" className="text-right">Class*</Label>
                                <Select value={formData.classId} onValueChange={(val) => handleChange('classId', val)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.length === 0 ? (
                                            <SelectItem value="loading" disabled>Loading classes...</SelectItem>
                                        ) : (
                                            classes.map(cls => (
                                                <SelectItem key={cls.id} value={cls.id.toString()}>
                                                    {cls.className + "'" + cls.sections.map(sec => sec.name) || `Class ${cls.id}`}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>

                                </Select>
                            </div>
                            {/* <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="academicYearId" className="text-right">Academic Year</Label>
                                <Select value={formData.academicYearId} onValueChange={(val) => handleChange('academicYearId', val)}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select academic year (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {academicYears.map((year) => (
                                            <SelectItem key={year.id} value={year.id}>{year.name || year.year || year.id}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div> */}
                            <div className="flex flex-col gap-4">
                                <Label className="text-right">PDF*</Label>
                                <div className="col-span-3">
                                    <PdfUploadButton field="syllabus" onFileChange={setSelectedFile} resetKey={resetKey} />
                                </div>
                            </div>
                        </div>
                        <Button onClick={handleSubmit} className="mt-4 w-full flex items-center justify-center" disabled={uploading}>{uploading ? (
                            <Loader2 className="animate-spin" color="white" size={30} />
                        ) : ('Save')}</Button>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
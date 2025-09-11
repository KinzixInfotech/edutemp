// components/SyllabusManagement.jsx (Main component, adapted and professional)
'use client'

import { useState, useEffect } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { useUploadThing } from "@uploadthing/react"; // Assuming setup
import axios from 'axios';
import dynamic from 'next/dynamic';
import { uploadFiles, useUploadThing } from "@/app/components/utils/uploadThing";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Loader2 } from "lucide-react";

const PdfUploadButton = dynamic(() => import('@/components/upload'), { ssr: false });

export default function SyllabusManagement() {
    const { startUpload } = useUploadThing("syllabus");

    const { fullUser } = useAuth();
    const [syllabi, setSyllabi] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setuploading] = useState(false)
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [classes, setClasses] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [formData, setFormData] = useState({ classId: '', academicYearId: '' });
    const [selectedFile, setSelectedFile] = useState(null);
    const [formError, setFormError] = useState('');
    const [resetKey, setResetKey] = useState(0);



    useEffect(() => {
        if (!fullUser?.schoolId) return;
        console.log('fetchig');

        const schoolId = fullUser?.schoolId;

        async function fetchData() {
            try {
                // Fetch syllabus
                const syllabusRes = await fetch(`/api/schools/syllabus?schoolId=${schoolId}`);
                if (!syllabusRes.ok) {
                    throw new Error(`Failed to fetch syllabus: ${syllabusRes.statusText}`);
                }
                const syllabiData = await syllabusRes.json();

                // Fetch classes
                const classesRes = await fetch(`/api/schools/${schoolId}/classes`);
                if (!classesRes.ok) {
                    throw new Error(`Failed to fetch classes: ${classesRes.statusText}`);
                }
                const classesData = await classesRes.json();
                // // Fetch academic years
                // const yearsRes = await fetch(`/api/academic-years?schoolId=${schoolId}`);
                // if (!yearsRes.ok) {
                //     throw new Error(`Failed to fetch academic years: ${yearsRes.statusText}`);
                // }
                // const yearsData = await yearsRes.json();

                // Set state
                setSyllabi(syllabiData);
                setClasses(classesData);
            } catch (err) {
                console.error("Fetching error:", err);
            } finally {
                setLoading(false);
            }
        }


        fetchData();
    }, [fullUser?.schoolId]);

    const handleChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            setFormError('Please upload a PDF file.');
            return;
        }
        if (!formData.classId) {
            setFormError('Please select a class.');
            return;
        }

        setFormError('');
        try {
            setuploading(true)
            // const uploadRes = await startUpload([selectedFile]);
            const uploadRes = await startUpload([selectedFile], {
                schoolId: fullUser?.schoolId,
                classId: formData?.classId,
            });
            if (!uploadRes || !uploadRes[0].ufsUrl) {
                throw new Error('Upload failed');
            }
            const fileUrl = uploadRes[0].ufsUrl;
            console.log(fileUrl,'uploaded one');
            
            console.log({
                fileUrl,
                schoolId: fullUser?.schoolId,
                classId: formData?.classId,
                academicYearId: formData.academicYearId || null,
            });

            const res = await axios.post('/api/schools/syllabus', {
                fileUrl,
                schoolId: fullUser?.schoolId,
                classId: formData?.classId,
                academicYearId: formData.academicYearId || null,
            });
            setSyllabi([...syllabi, res.data]);
            setDrawerOpen(false);
            setSelectedFile(null);
            setFormData({ classId: '', academicYearId: '' });
            setResetKey((prev) => prev + 1);
        } catch (err) {
            setFormError(err);
            console.error(err);
        } finally {
            setuploading(false)
        }
    };
    useEffect(() => {
        console.log(syllabi);

    }, [syllabi])


    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this syllabus?')) return;
        try {
            await axios.delete('/api/schools/syllabus', { data: { id } });
            setSyllabi(syllabi.filter((s) => s.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Syllabus Management</h2>
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
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4">Loading...</TableCell>
                            </TableRow>
                        ) : syllabi.length > 0 ? (
                            syllabi.map((syllabus, index) => (
                                <TableRow key={syllabus.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{syllabus.Class?.className || 'N/A'}</TableCell>
                                    <TableCell>{syllabus.AcademicYear?.name || 'N/A'}</TableCell>
                                    <TableCell>{new Date(syllabus.uploadedAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Link
                                            href={`syllabus-managment/view?url=${encodeURIComponent(syllabus.fileUrl)}`}
                                        // className="text-blue-500 underline"
                                        >
                                            <Button variant='outline'>View Syllabus</Button>
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
                            <Loader2 className="animate-spin" color="white" size={30}/>
                        ) : ('Save')}</Button>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
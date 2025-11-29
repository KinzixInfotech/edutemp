"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Search, UserPlus, Users, GraduationCap, Building2, Mail, Phone } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function AlumniManagementPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [alumni, setAlumni] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [graduationYearFilter, setGraduationYearFilter] = useState("");
    const [leavingReasonFilter, setLeavingReasonFilter] = useState("");
    const [selectedAlumni, setSelectedAlumni] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    useEffect(() => {
        if (schoolId) {
            fetchAlumni();
        }
    }, [schoolId, graduationYearFilter, leavingReasonFilter]);

    const fetchAlumni = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (graduationYearFilter && graduationYearFilter !== 'all') {
                params.append("graduationYear", graduationYearFilter);
            }
            if (leavingReasonFilter && leavingReasonFilter !== 'all') {
                params.append("leavingReason", leavingReasonFilter);
            }
            if (searchTerm) params.append("search", searchTerm);

            const res = await axios.get(`/api/schools/${schoolId}/alumni?${params.toString()}`);
            setAlumni(res.data.alumni || []);
        } catch (error) {
            console.error("Failed to fetch alumni", error);
            toast.error("Failed to load alumni");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchAlumni();
    };

    const viewAlumniDetails = async (alumniId) => {
        try {
            const res = await axios.get(`/api/schools/${schoolId}/alumni/${alumniId}`);
            setSelectedAlumni(res.data);
            setIsDetailsOpen(true);
        } catch (error) {
            console.error("Failed to fetch alumni details", error);
            toast.error("Failed to load alumni details");
        }
    };

    if (!schoolId) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Alumni Management</h1>
                <p className="text-muted-foreground mt-2">
                    Manage and connect with your school's alumni network
                </p>
            </div>

            <Separator />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Alumni</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{alumni.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Willing to Mentor</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {alumni.filter(a => a.willingToMentor).length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Latest Batch</CardTitle>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {alumni.length > 0 ? Math.max(...alumni.map(a => a.graduationYear)) : '-'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Search & Filter</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                            <Label>Search</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Search by name, email, or admission number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <Button onClick={handleSearch}>
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div>
                            <Label>Graduation Year</Label>
                            <Select value={graduationYearFilter} onValueChange={setGraduationYearFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Years" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {[...new Set(alumni.map(a => a.graduationYear))].sort((a, b) => b - a).map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Leaving Reason</Label>
                            <Select value={leavingReasonFilter} onValueChange={setLeavingReasonFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Reasons" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Reasons</SelectItem>
                                    <SelectItem value="GRADUATED">Graduated</SelectItem>
                                    <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                                    <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Alumni List */}
            <Card>
                <CardHeader>
                    <CardTitle>Alumni Directory</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : alumni.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No alumni found
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {alumni.map((alumnus) => (
                                <div
                                    key={alumnus.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => viewAlumniDetails(alumnus.id)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{alumnus.name}</h3>
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                Class of {alumnus.graduationYear}
                                            </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {alumnus.lastClass?.className} - {alumnus.lastSection?.name} • {alumnus.admissionNo}
                                        </div>
                                        {alumnus.currentOccupation && (
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                                <Building2 className="h-3 w-3" />
                                                {alumnus.currentOccupation}
                                                {alumnus.currentCompany && ` at ${alumnus.currentCompany}`}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {alumnus.willingToMentor && (
                                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-1 rounded">
                                                Mentor
                                            </span>
                                        )}
                                        <Button variant="outline" size="sm">
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Alumni Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Alumni Details</DialogTitle>
                    </DialogHeader>
                    {selectedAlumni && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Name</Label>
                                    <p className="font-medium">{selectedAlumni.name}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Admission No</Label>
                                    <p className="font-medium">{selectedAlumni.admissionNo}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Graduation Year</Label>
                                    <p className="font-medium">{selectedAlumni.graduationYear}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Last Class</Label>
                                    <p className="font-medium">
                                        {selectedAlumni.lastClass?.className} - {selectedAlumni.lastSection?.name}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="font-semibold mb-2">Contact Information</h3>
                                <div className="space-y-2">
                                    {selectedAlumni.currentEmail && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            {selectedAlumni.currentEmail}
                                        </div>
                                    )}
                                    {selectedAlumni.currentPhone && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            {selectedAlumni.currentPhone}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(selectedAlumni.currentOccupation || selectedAlumni.higherEducation) && (
                                <>
                                    <Separator />
                                    <div>
                                        <h3 className="font-semibold mb-2">Professional Information</h3>
                                        <div className="space-y-2 text-sm">
                                            {selectedAlumni.currentOccupation && (
                                                <p><strong>Occupation:</strong> {selectedAlumni.currentOccupation}</p>
                                            )}
                                            {selectedAlumni.currentCompany && (
                                                <p><strong>Company:</strong> {selectedAlumni.currentCompany}</p>
                                            )}
                                            {selectedAlumni.higherEducation && (
                                                <p><strong>Higher Education:</strong> {selectedAlumni.higherEducation}</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedAlumni.achievements && (
                                <>
                                    <Separator />
                                    <div>
                                        <h3 className="font-semibold mb-2">Achievements</h3>
                                        <p className="text-sm text-muted-foreground">{selectedAlumni.achievements}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

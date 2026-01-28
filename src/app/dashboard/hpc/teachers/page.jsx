'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ChevronLeft, UserCheck, BookOpen, Activity, Search, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function HPCTeachersPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('1');

    const { data, isLoading } = useQuery({
        queryKey: ['hpc-teachers-overview', schoolId, selectedTerm],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/hpc/teachers/overview?termNumber=${selectedTerm}`);
            if (!res.ok) return { teachers: [] };
            return res.json();
        },
        enabled: !!schoolId,
    });

    const teachers = data?.teachers || [];

    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/dashboard/hpc"><Button variant="ghost" size="icon"><ChevronLeft className="w-5 h-5" /></Button></Link>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <UserCheck className="w-7 h-7 text-teal-600" />Teacher Oversight
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Track HPC grading progress by teacher</p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="space-y-1">
                        <CardTitle>Grading Progress</CardTitle>
                        <CardDescription>Assessments & Feedback entries per teacher</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Term 1</SelectItem>
                                <SelectItem value="2">Term 2</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search teachers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Teacher</TableHead>
                                    <TableHead className="text-center">Academic Entries</TableHead>
                                    <TableHead className="text-center">SEL Entries</TableHead>
                                    <TableHead className="text-center">Activity Entries</TableHead>
                                    <TableHead className="text-center">Total Entries</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTeachers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No data found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTeachers.map((teacher) => (
                                        <TableRow key={teacher.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={teacher?.profilePicture} />

                                                        <AvatarFallback>{teacher.name.charAt(0)}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium text-sm">{teacher.name}</p>
                                                        <p className="text-xs text-muted-foreground">{teacher.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <BookOpen className="w-4 h-4 text-blue-500" />
                                                    {teacher.assessmentsCount}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Heart className="w-4 h-4 text-pink-500" />
                                                    {teacher.selCount || 0}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Activity className="w-4 h-4 text-green-500" />
                                                    {teacher.activitiesCount}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-bold">
                                                {teacher.totalEntries}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {teacher.totalEntries > 0 ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-gray-100 text-gray-500">No Entries</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

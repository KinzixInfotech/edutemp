'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { BarChart3, Download, FileText, Users, ChevronLeft, Loader2, Eye, Printer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function HPCReportsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedTerm, setSelectedTerm] = useState('1');

    const { data: classesData } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`);
            if (!res.ok) return [];
            return res.json();
        },
        enabled: !!schoolId,
    });

    const classes = classesData?.classes || classesData || [];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/dashboard/hpc"><Button variant="ghost" size="icon"><ChevronLeft className="w-5 h-5" /></Button></Link>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <BarChart3 className="w-7 h-7 text-indigo-600" />HPC Reports
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Generate and export Holistic Progress Cards</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-dashed hover:border-purple-300">
                    <CardContent className="pt-6 text-center">
                        <FileText className="w-10 h-10 mx-auto text-purple-500 mb-3" />
                        <h4 className="font-medium">Generate HPC PDF</h4>
                        <p className="text-sm text-muted-foreground mt-1">Single or bulk generation</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-dashed hover:border-blue-300">
                    <CardContent className="pt-6 text-center">
                        <Download className="w-10 h-10 mx-auto text-blue-500 mb-3" />
                        <h4 className="font-medium">Export Data</h4>
                        <p className="text-sm text-muted-foreground mt-1">Excel/CSV export</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-dashed hover:border-green-300">
                    <CardContent className="pt-6 text-center">
                        <Users className="w-10 h-10 mx-auto text-green-500 mb-3" />
                        <h4 className="font-medium">Class Reports</h4>
                        <p className="text-sm text-muted-foreground mt-1">Class-wise HPC summary</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="border-b"><CardTitle>Bulk Generate HPC</CardTitle><CardDescription>Generate PDFs for multiple students</CardDescription></CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Class</Label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Classes</SelectItem>
                                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Term</Label>
                            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Term 1</SelectItem>
                                    <SelectItem value="2">Term 2</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end"><Button className="w-full"><Printer className="w-4 h-4 mr-2" />Generate PDFs</Button></div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="border-b"><CardTitle>Parent Portal Settings</CardTitle></CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div><Label>Allow parents to view HPC</Label><p className="text-xs text-muted-foreground">Parents can see their child's HPC in the app</p></div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div><Label>Allow HPC download</Label><p className="text-xs text-muted-foreground">Parents can download PDF from the app</p></div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

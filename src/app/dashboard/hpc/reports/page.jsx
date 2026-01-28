'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { BarChart3, Download, FileText, Users, ChevronLeft, Loader2, Eye, Printer, TrendingUp, AlertCircle, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';

export default function HPCReportsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedTerm, setSelectedTerm] = useState('1');
    const [activeTab, setActiveTab] = useState('generate');

    // Fetch Classes
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

    // Fetch Analytics (Only if a class is selected)
    const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
        queryKey: ['hpc-analytics', schoolId, selectedClass, selectedTerm],
        queryFn: async () => {
            if (selectedClass === 'all') return null;
            const res = await fetch(`/api/schools/${schoolId}/hpc/analytics?classId=${selectedClass}&termNumber=${selectedTerm}`);
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!schoolId && selectedClass !== 'all',
    });

    const handleBulkPrint = () => {
        if (selectedClass === 'all') return alert('Please select a specific class first.');
        // Open print page in new tab
        window.open(`/dashboard/hpc/reports/print?classId=${selectedClass}&term=${selectedTerm}`, '_blank');
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-3">
                <Link href="/dashboard/hpc"><Button variant="ghost" size="icon"><ChevronLeft className="w-5 h-5" /></Button></Link>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <BarChart3 className="w-7 h-7 text-indigo-600" />HPC Reports & Analytics
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Generate reports and view class performance</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="generate">Generate Reports</TabsTrigger>
                    <TabsTrigger value="analytics">Class Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="generate" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="hover:border-purple-300 transition-colors">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg"><FileText className="w-6 h-6 text-purple-600" /></div>
                                    <CardTitle>Bulk PDF Generation</CardTitle>
                                </div>
                                <CardDescription>Generate and print HPCs for an entire class</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Class</Label>
                                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                                            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Select Class...</SelectItem>
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
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={handleBulkPrint}
                                    disabled={selectedClass === 'all'}
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Generate & Print All
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="hover:border-blue-300 transition-colors">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg"><Download className="w-6 h-6 text-blue-600" /></div>
                                    <CardTitle>Data Export</CardTitle>
                                </div>
                                <CardDescription>Export HPC data to Excel/CSV</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Data Type</Label>
                                        <Select defaultValue="full">
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="full">Full Report Data</SelectItem>
                                                <SelectItem value="scores">Scores Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Format</Label>
                                        <Select defaultValue="csv">
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="csv">CSV</SelectItem>
                                                <SelectItem value="json">JSON</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Button variant="outline" className="w-full" disabled>
                                    <Download className="w-4 h-4 mr-2" />
                                    Export Data (Coming Soon)
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

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
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-[200px]">
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Select Class...</SelectItem>
                                        {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-[150px]">
                                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Term 1</SelectItem>
                                        <SelectItem value="2">Term 2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {selectedClass === 'all' ? (
                        <div className="p-12 text-center bg-muted/30 rounded-lg border border-dashed">
                            <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                            <h3 className="font-medium text-lg">Select a class to view analytics</h3>
                            <p className="text-muted-foreground">Get insights on performance, participation, and more.</p>
                        </div>
                    ) : analyticsLoading ? (
                        <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
                    ) : !analyticsData ? (
                        <div className="p-12 text-center text-red-500">Failed to load analytics data</div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Class Average</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{analyticsData.averageScore}%</div>
                                        <p className="text-xs text-muted-foreground mt-1">Overall performance index</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Reports Generated</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{analyticsData.completedReports} / {analyticsData.totalStudents}</div>
                                        <Progress value={(analyticsData.completedReports / analyticsData.totalStudents) * 100} className="h-2 mt-2" />
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Activity Participation</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{analyticsData.activityParticipation}%</div>
                                        <p className="text-xs text-muted-foreground mt-1">Students with &gt;1 activity</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Top Performers */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <Trophy className="w-5 h-5 text-yellow-500" />
                                            <CardTitle>Top Performers</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {analyticsData.topPerformers?.map((student, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-xs">{i + 1}</div>
                                                        <div>
                                                            <p className="font-medium text-sm">{student.name}</p>
                                                            <p className="text-xs text-muted-foreground">Roll: {student.rollNumber}</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{student.score}%</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-orange-500" />
                                            <CardTitle>Needs Attention</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {analyticsData.lowPerformers?.length > 0 ? analyticsData.lowPerformers.map((student, i) => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-sm">{student.name}</p>
                                                        <p className="text-xs text-muted-foreground">Score: {student.score}%</p>
                                                    </div>
                                                    <Button variant="ghost" size="sm" className="text-xs">View HPC</Button>
                                                </div>
                                            )) : <p className="text-sm text-gray-500 italic">No students flagged for attention.</p>}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

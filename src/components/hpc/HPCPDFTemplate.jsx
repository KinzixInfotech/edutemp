'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, GraduationCap, BookOpen, Heart, Activity, MessageSquare, User } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Grade color mapping
const gradeColors = {
    'A+': 'bg-emerald-500',
    'A': 'bg-emerald-400',
    'B+': 'bg-blue-500',
    'B': 'bg-blue-400',
    'C+': 'bg-amber-500',
    'C': 'bg-amber-400',
    'D': 'bg-orange-500',
    'EXCELLENT': 'bg-emerald-500',
    'VERY_GOOD': 'bg-emerald-400',
    'GOOD': 'bg-blue-500',
    'SATISFACTORY': 'bg-amber-500',
    'NEEDS_IMPROVEMENT': 'bg-orange-500',
};

const gradeLabels = {
    'EXCELLENT': 'Excellent',
    'VERY_GOOD': 'Very Good',
    'GOOD': 'Good',
    'SATISFACTORY': 'Satisfactory',
    'NEEDS_IMPROVEMENT': 'Needs Improvement',
};

export default function HPCPDFTemplate({ data, studentInfo, schoolInfo, termInfo }) {
    const printRef = useRef();

    // Destructure data
    const {
        competencyAssessments = [],
        activityRecords = [],
        selAssessments = [],
        reflection = null,
        teacherFeedback = null,
        parentFeedback = null,
    } = data || {};

    // Group competencies by subject
    const competenciesBySubject = competencyAssessments.reduce((acc, item) => {
        const subjectName = item.competency?.subject?.name || 'General';
        if (!acc[subjectName]) acc[subjectName] = [];
        acc[subjectName].push(item);
        return acc;
    }, {});

    // Group activities by category
    const activitiesByCategory = activityRecords.reduce((acc, item) => {
        const catName = item.activity?.category?.name || 'Other';
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(item);
        return acc;
    }, {});

    // Group SEL by category
    const selByCategory = selAssessments.reduce((acc, item) => {
        const cat = item.parameter?.category || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        // Use browser print to PDF
        window.print();
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            {/* Action Buttons - Hidden in print */}
            <div className="flex justify-end gap-2 mb-4 print:hidden">
                <Button variant="outline" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                </Button>
                <Button onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                </Button>
            </div>

            {/* Main HPC Document */}
            <div ref={printRef} className="bg-white dark:bg-gray-900 print:bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 print:bg-purple-600">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                <GraduationCap className="w-10 h-10" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{schoolInfo?.name || 'School Name'}</h1>
                                <p className="text-white/80 text-sm">{schoolInfo?.address || 'School Address'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <Badge className="bg-white/20 text-white border-0 text-lg px-4 py-1">
                                HOLISTIC PROGRESS CARD
                            </Badge>
                            <p className="text-white/80 mt-2 text-sm">NEP 2020 Compliant</p>
                        </div>
                    </div>
                </div>

                {/* Student Info Bar */}
                <div className="bg-gray-100 dark:bg-gray-800 print:bg-gray-100 p-4 border-b">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Student Name</span>
                            <p className="font-semibold">{studentInfo?.name || 'Student Name'}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Class / Section</span>
                            <p className="font-semibold">{studentInfo?.class || 'Class'} - {studentInfo?.section || 'Section'}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Academic Year</span>
                            <p className="font-semibold">{termInfo?.academicYear || '2024-25'}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Term</span>
                            <p className="font-semibold">Term {termInfo?.termNumber || 1}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Section 1: Academic Competencies */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg print:bg-blue-100">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-lg font-bold">Academic Competencies</h2>
                        </div>

                        {Object.keys(competenciesBySubject).length === 0 ? (
                            <p className="text-gray-500 text-sm italic">No competency assessments recorded for this term.</p>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(competenciesBySubject).map(([subject, assessments]) => (
                                    <div key={subject} className="border rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 dark:bg-gray-800 print:bg-gray-50 px-4 py-2 font-medium text-blue-600">
                                            {subject}
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Competency</TableHead>
                                                    <TableHead className="text-center w-24">Grade</TableHead>
                                                    <TableHead>Remarks</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {assessments.map((a) => (
                                                    <TableRow key={a.id}>
                                                        <TableCell className="font-medium">{a.competency?.name}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={`${gradeColors[a.grade] || 'bg-gray-400'} text-white`}>
                                                                {a.grade}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-gray-600 text-sm">{a.remarks || '-'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Section 2: Co-Curricular Activities */}
                    <section className="page-break-inside-avoid">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg print:bg-green-100">
                                <Activity className="w-5 h-5 text-green-600" />
                            </div>
                            <h2 className="text-lg font-bold">Co-Curricular Activities</h2>
                        </div>

                        {Object.keys(activitiesByCategory).length === 0 ? (
                            <p className="text-gray-500 text-sm italic">No activity records for this term.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(activitiesByCategory).map(([category, records]) => (
                                    <Card key={category} className="print:border print:shadow-none">
                                        <CardHeader className="py-3">
                                            <CardTitle className="text-sm text-green-600">{category}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <ul className="space-y-2">
                                                {records.map((r) => (
                                                    <li key={r.id} className="flex items-center justify-between text-sm">
                                                        <span>{r.activity?.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline">{r.participationType}</Badge>
                                                            {r.achievement && (
                                                                <Badge className="bg-amber-100 text-amber-700 border-0">
                                                                    {r.achievement}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Section 3: Behavior & Social-Emotional Learning */}
                    <section className="page-break-inside-avoid">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg print:bg-pink-100">
                                <Heart className="w-5 h-5 text-pink-600" />
                            </div>
                            <h2 className="text-lg font-bold">Behavior & Social-Emotional Learning</h2>
                        </div>

                        {Object.keys(selByCategory).length === 0 ? (
                            <p className="text-gray-500 text-sm italic">No SEL assessments recorded for this term.</p>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(selByCategory).map(([category, assessments]) => (
                                    <div key={category}>
                                        <h4 className="text-sm font-medium text-pink-600 mb-2">{category}</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {assessments.map((a) => (
                                                <div key={a.id} className="p-3 bg-gray-50 dark:bg-gray-800 print:bg-gray-50 rounded-lg">
                                                    <p className="text-sm font-medium">{a.parameter?.name}</p>
                                                    <Badge className={`${gradeColors[a.grade] || 'bg-gray-400'} text-white mt-1`}>
                                                        {gradeLabels[a.grade] || a.grade}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Section 4: Student Reflection */}
                    {reflection && (
                        <section className="page-break-inside-avoid">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg print:bg-purple-100">
                                    <User className="w-5 h-5 text-purple-600" />
                                </div>
                                <h2 className="text-lg font-bold">Student Reflection</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {reflection.whatILearned && (
                                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 print:bg-purple-50 rounded-lg">
                                        <h4 className="text-sm font-medium text-purple-600 mb-2">What I Learned</h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 print:text-gray-700">{reflection.whatILearned}</p>
                                    </div>
                                )}
                                {reflection.whatIChallenged && (
                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 print:bg-orange-50 rounded-lg">
                                        <h4 className="text-sm font-medium text-orange-600 mb-2">Challenges I Faced</h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 print:text-gray-700">{reflection.whatIChallenged}</p>
                                    </div>
                                )}
                                {reflection.whatIWantToImprove && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 print:bg-blue-50 rounded-lg">
                                        <h4 className="text-sm font-medium text-blue-600 mb-2">Areas to Improve</h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 print:text-gray-700">{reflection.whatIWantToImprove}</p>
                                    </div>
                                )}
                                {reflection.goalsForNextTerm && (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 print:bg-green-50 rounded-lg">
                                        <h4 className="text-sm font-medium text-green-600 mb-2">Goals for Next Term</h4>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 print:text-gray-700">{reflection.goalsForNextTerm}</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Section 5: Teacher & Parent Feedback */}
                    <section className="page-break-inside-avoid">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg print:bg-amber-100">
                                <MessageSquare className="w-5 h-5 text-amber-600" />
                            </div>
                            <h2 className="text-lg font-bold">Feedback</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Teacher Feedback */}
                            <div className="border rounded-lg p-4">
                                <h4 className="font-medium text-sm text-gray-500 mb-2">Teacher's Feedback</h4>
                                {teacherFeedback ? (
                                    <>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 print:text-gray-700 mb-3">
                                            {teacherFeedback.narrativeFeedback}
                                        </p>
                                        {teacherFeedback.areasOfImprovement && (
                                            <div className="text-xs text-gray-500">
                                                <span className="font-medium">Areas to focus:</span> {teacherFeedback.areasOfImprovement}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400 mt-2">
                                            — {teacherFeedback.teacher?.user?.name || 'Class Teacher'}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No feedback provided yet.</p>
                                )}
                            </div>

                            {/* Parent Feedback */}
                            <div className="border rounded-lg p-4">
                                <h4 className="font-medium text-sm text-gray-500 mb-2">Parent's Feedback</h4>
                                {parentFeedback ? (
                                    <>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 print:text-gray-700 mb-2">
                                            {parentFeedback.observationsAtHome}
                                        </p>
                                        {parentFeedback.suggestions && (
                                            <div className="text-xs text-gray-500">
                                                <span className="font-medium">Suggestions:</span> {parentFeedback.suggestions}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400 mt-2">
                                            — {parentFeedback.parent?.user?.name || 'Parent'}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No feedback provided yet.</p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 dark:bg-gray-800 print:bg-gray-50 p-4 border-t text-center text-xs text-gray-500">
                    <div className="flex justify-between items-center">
                        <div>Generated on: {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</div>
                        <div>Holistic Progress Card - NEP 2020</div>
                        <div>Page 1 of 1</div>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body { 
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .page-break-inside-avoid {
                        page-break-inside: avoid;
                    }
                    @page {
                        size: A4;
                        margin: 1cm;
                    }
                }
            `}</style>
        </div>
    );
}

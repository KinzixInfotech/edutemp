"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Loader2,
    BookPlus,
    BookMinus,
    AlertCircle,
    Calendar,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function LibraryTransactionsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [books, setBooks] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedCopy, setSelectedCopy] = useState(null);
    const [copies, setCopies] = useState([]);

    const [issueForm, setIssueForm] = useState({
        copyId: "",
        userId: "",
        userType: "STUDENT",
        dueDate: "",
    });

    const [returnForm, setReturnForm] = useState({
        transactionId: "",
        remarks: "",
    });

    useEffect(() => {
        if (schoolId) {
            fetchData();
        }
    }, [schoolId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [booksRes, settingsRes] = await Promise.all([
                axios.get(`/api/schools/${schoolId}/library/books`),
                axios.get(`/api/schools/${schoolId}/library/settings`),
            ]);

            setBooks(booksRes.data.data);
            setSettings(settingsRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const fetchCopies = async (bookId) => {
        try {
            const res = await axios.get(
                `/api/schools/${schoolId}/library/books/${bookId}/copies`
            );
            setCopies(res.data);
        } catch (error) {
            toast.error("Failed to fetch copies");
        }
    };

    const handleIssueBook = async () => {
        try {
            await axios.post(`/api/schools/${schoolId}/library/transactions/issue`, issueForm);
            toast.success("Book issued successfully");
            fetchData();
            setIssueForm({
                copyId: "",
                userId: "",
                userType: "STUDENT",
                dueDate: "",
            });
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to issue book");
        }
    };

    const handleReturnBook = async () => {
        try {
            const res = await axios.post(
                `/api/schools/${schoolId}/library/transactions/return`,
                returnForm
            );

            if (res.data.fineAmount > 0) {
                toast.warning(`Book returned. Fine: ₹${res.data.fineAmount}`);
            } else {
                toast.success("Book returned successfully");
            }

            fetchData();
            setReturnForm({ transactionId: "", remarks: "" });
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to return book");
        }
    };

    const calculateDueDate = (userType) => {
        if (!settings) return "";

        const days =
            userType === "STUDENT"
                ? settings.issueDaysStudent
                : settings.issueDaysTeacher;

        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days);
        return dueDate.toISOString().split("T")[0];
    };

    useEffect(() => {
        if (issueForm.userType && settings) {
            setIssueForm({
                ...issueForm,
                dueDate: calculateDueDate(issueForm.userType),
            });
        }
    }, [issueForm.userType, settings]);

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
                <h1 className="text-3xl font-bold tracking-tight">Issue & Return Books</h1>
                <p className="text-muted-foreground mt-2">
                    Manage book issues and returns with automatic fine calculation
                </p>
            </div>

            <Separator />

            {/* Settings Info */}
            {settings && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Library Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Student Limit</p>
                                <p className="font-semibold">{settings.maxBooksStudent} books</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Teacher Limit</p>
                                <p className="font-semibold">{settings.maxBooksTeacher} books</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Student Duration</p>
                                <p className="font-semibold">{settings.issueDaysStudent} days</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Fine Per Day</p>
                                <p className="font-semibold">₹{settings.finePerDay}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="issue" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="issue">
                        <BookPlus className="h-4 w-4 mr-2" />
                        Issue Book
                    </TabsTrigger>
                    <TabsTrigger value="return">
                        <BookMinus className="h-4 w-4 mr-2" />
                        Return Book
                    </TabsTrigger>
                </TabsList>

                {/* Issue Tab */}
                <TabsContent value="issue" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Issue a Book</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Select Book</Label>
                                    <Select
                                        onValueChange={(value) => {
                                            fetchCopies(value);
                                            setIssueForm({ ...issueForm, copyId: "" });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a book" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {books
                                                .filter((b) => b.availableCopies > 0)
                                                .map((book) => (
                                                    <SelectItem key={book.id} value={book.id}>
                                                        {book.title} ({book.availableCopies} available)
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Select Copy</Label>
                                    <Select
                                        value={issueForm.copyId}
                                        onValueChange={(value) =>
                                            setIssueForm({ ...issueForm, copyId: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a copy" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {copies
                                                .filter((c) => c.status === "AVAILABLE")
                                                .map((copy) => (
                                                    <SelectItem key={copy.id} value={copy.id}>
                                                        {copy.accessionNumber} - {copy.condition}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>User Type</Label>
                                    <Select
                                        value={issueForm.userType}
                                        onValueChange={(value) =>
                                            setIssueForm({ ...issueForm, userType: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="STUDENT">Student</SelectItem>
                                            <SelectItem value="TEACHER">Teacher</SelectItem>
                                            <SelectItem value="STAFF">Staff</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>User ID</Label>
                                    <Input
                                        value={issueForm.userId}
                                        onChange={(e) =>
                                            setIssueForm({ ...issueForm, userId: e.target.value })
                                        }
                                        placeholder="Enter user ID"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Due Date</Label>
                                    <Input
                                        type="date"
                                        value={issueForm.dueDate}
                                        onChange={(e) =>
                                            setIssueForm({ ...issueForm, dueDate: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            <Button onClick={handleIssueBook} className="mt-6 w-full">
                                <BookPlus className="h-4 w-4 mr-2" />
                                Issue Book
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Return Tab */}
                <TabsContent value="return" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Return a Book</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Transaction ID</Label>
                                    <Input
                                        value={returnForm.transactionId}
                                        onChange={(e) =>
                                            setReturnForm({ ...returnForm, transactionId: e.target.value })
                                        }
                                        placeholder="Enter transaction ID"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        The transaction ID is provided when a book is issued
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Remarks (Optional)</Label>
                                    <Input
                                        value={returnForm.remarks}
                                        onChange={(e) =>
                                            setReturnForm({ ...returnForm, remarks: e.target.value })
                                        }
                                        placeholder="Any notes about the return"
                                    />
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-medium text-yellow-900">Automatic Fine Calculation</p>
                                            <p className="text-yellow-700 mt-1">
                                                If the book is returned after the due date, a fine of ₹
                                                {settings?.finePerDay || 5} per day will be automatically calculated.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Button onClick={handleReturnBook} className="w-full">
                                    <BookMinus className="h-4 w-4 mr-2" />
                                    Return Book
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
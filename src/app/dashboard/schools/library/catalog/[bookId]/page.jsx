"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Loader2,
    ArrowLeft,
    Book,
    BookOpen,
    AlertTriangle,
    Trash2,
    DollarSign,
    Calendar,
    User,
    CheckCircle2,
    XCircle,
    Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function BookDetailPage() {
    const { fullUser } = useAuth();
    const params = useParams();
    const router = useRouter();
    const schoolId = fullUser?.schoolId;
    const bookId = params.bookId;

    const [loading, setLoading] = useState(true);
    const [book, setBook] = useState(null);
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        if (schoolId && bookId) {
            fetchBookDetails();
        }
    }, [schoolId, bookId]);

    const fetchBookDetails = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `/api/schools/${schoolId}/library/books/${bookId}`
            );
            setBook(res.data.book);
            setTransactions(res.data.transactions);
        } catch (error) {
            console.error("Failed to fetch book details", error);
            toast.error("Failed to load book details");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            AVAILABLE: { variant: "default", className: "bg-green-500 hover:bg-green-600" },
            ISSUED: { variant: "default", className: "bg-blue-500 hover:bg-blue-600" },
            DAMAGED: { variant: "default", className: "bg-orange-500 hover:bg-orange-600" },
            LOST: { variant: "default", className: "bg-red-500 hover:bg-red-600" },
            RESERVED: { variant: "default", className: "bg-purple-500 hover:bg-purple-600" },
        };
        return statusConfig[status] || { variant: "outline" };
    };

    const getConditionBadge = (condition) => {
        const conditionConfig = {
            NEW: { variant: "default", className: "bg-emerald-500" },
            GOOD: { variant: "default", className: "bg-green-500" },
            FAIR: { variant: "default", className: "bg-yellow-500" },
            POOR: { variant: "default", className: "bg-red-500" },
        };
        return conditionConfig[condition] || { variant: "outline" };
    };

    const getTransactionIcon = (status) => {
        switch (status) {
            case "RETURNED":
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case "OVERDUE":
                return <AlertTriangle className="h-4 w-4 text-red-500" />;
            case "LOST":
                return <XCircle className="h-4 w-4 text-red-600" />;
            default:
                return <Clock className="h-4 w-4 text-blue-500" />;
        }
    };

    if (!schoolId) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!book) {
        return (
            <div className="p-6">
                <div className="text-center">
                    <p className="text-muted-foreground">Book not found</p>
                    <Button onClick={() => router.back()} className="mt-4">
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">{book.title}</h1>
                    <p className="text-muted-foreground mt-1">
                        by {book.author} • ISBN: {book.ISBN}
                    </p>
                </div>
                <Badge variant="outline" className="text-sm">
                    {book.category}
                </Badge>
            </div>

            <Separator />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Copies
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Book className="h-4 w-4 text-muted-foreground" />
                            <span className="text-2xl font-bold">{book.totalCopies}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Available
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-2xl font-bold text-green-600">
                                {book.availableCopies}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Issued
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-blue-500" />
                            <span className="text-2xl font-bold text-blue-600">
                                {book.issuedCopies}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Damaged/Lost
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-2xl font-bold text-orange-600">
                                {book.damagedCopies + book.lostCopies}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Fines Collected
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            <span className="text-2xl font-bold text-green-600">
                                ₹{book.totalFines.toFixed(2)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="copies">
                        Copies ({book.totalCopies})
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        Transaction History ({transactions.length})
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Book Cover */}
                        {book.coverImage && (
                            <Card className="lg:col-span-1">
                                <CardContent className="p-6">
                                    <div className="aspect-[2/3] relative rounded-lg overflow-hidden border bg-muted">
                                        <img
                                            src={book.coverImage}
                                            alt={book.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Right Column - Book Details */}
                        <Card className={book.coverImage ? "lg:col-span-2" : "lg:col-span-3"}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Book className="h-5 w-5" />
                                    Book Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Title */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-1 bg-primary rounded-full" />
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    Title
                                                </p>
                                                <p className="font-semibold text-lg mt-0.5">
                                                    {book.title}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Author */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-1 bg-blue-500 rounded-full" />
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    Author
                                                </p>
                                                <p className="font-semibold text-lg mt-0.5">
                                                    {book.author}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ISBN */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-1 bg-green-500 rounded-full" />
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    ISBN
                                                </p>
                                                <p className="font-mono text-sm mt-0.5 bg-muted px-2 py-1 rounded inline-block">
                                                    {book.ISBN}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Category */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-1 bg-purple-500 rounded-full" />
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    Category
                                                </p>
                                                <Badge variant="secondary" className="mt-1">
                                                    {book.category}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Publisher */}
                                    {book.publisher && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-1 bg-orange-500 rounded-full" />
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                        Publisher
                                                    </p>
                                                    <p className="font-semibold mt-0.5">
                                                        {book.publisher}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Edition */}
                                    {book.edition && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-1 bg-pink-500 rounded-full" />
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                        Edition
                                                    </p>
                                                    <p className="font-semibold mt-0.5">
                                                        {book.edition}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Description Card */}
                    {book.description && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    {book.description}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Quick Stats Grid */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Availability Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 bg-muted/50 rounded-lg">
                                    <Book className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-2xl font-bold">{book.totalCopies}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Total Copies</p>
                                </div>
                                <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                                    <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
                                    <p className="text-2xl font-bold text-green-600">{book.availableCopies}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Available</p>
                                </div>
                                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                    <BookOpen className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                                    <p className="text-2xl font-bold text-blue-600">{book.issuedCopies}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Issued</p>
                                </div>
                                <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                                    <p className="text-2xl font-bold text-orange-600">
                                        {book.damagedCopies + book.lostCopies}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">Damaged/Lost</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Copies Tab */}
                <TabsContent value="copies">
                    <Card>
                        <CardHeader>
                            <CardTitle>Book Copies</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Accession Number</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Condition</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Added On</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {book.copies.map((copy) => (
                                        <TableRow key={copy.id}>
                                            <TableCell className="font-mono text-sm">
                                                {copy.accessionNumber}
                                            </TableCell>
                                            <TableCell>
                                                <Badge {...getStatusBadge(copy.status)}>
                                                    {copy.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge {...getConditionBadge(copy.condition)}>
                                                    {copy.condition}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {copy.location || "N/A"}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {format(new Date(copy.createdAt), "MMM dd, yyyy")}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Transaction Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] pr-4">
                                {transactions.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        <p>No transaction history yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {transactions.map((transaction, index) => (
                                            <div
                                                key={transaction.id}
                                                className="relative pl-8 pb-8 border-l-2 border-muted last:border-l-0 last:pb-0"
                                            >
                                                {/* Timeline dot */}
                                                <div className="absolute left-[-9px] top-0 bg-background p-1 rounded-full border-2 border-muted">
                                                    {getTransactionIcon(transaction.status)}
                                                </div>

                                                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                                                    {/* User Info */}
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-10 w-10 border">
                                                            <AvatarImage src={transaction.user.profilePicture} />
                                                            <AvatarFallback className="text-xs">
                                                                {transaction.user.name
                                                                    .split(" ")
                                                                    .map((n) => n[0])
                                                                    .join("")
                                                                    .slice(0, 2)
                                                                    .toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-sm">
                                                                {transaction.user.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {transaction.userType}
                                                            </p>
                                                        </div>
                                                        <Badge
                                                            variant={
                                                                transaction.status === "RETURNED"
                                                                    ? "default"
                                                                    : transaction.status === "OVERDUE"
                                                                        ? "destructive"
                                                                        : "secondary"
                                                            }
                                                        >
                                                            {transaction.status}
                                                        </Badge>
                                                    </div>

                                                    {/* Transaction Details */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">
                                                                Copy
                                                            </p>
                                                            <p className="font-mono text-xs">
                                                                {transaction.copy.accessionNumber}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">
                                                                Issue Date
                                                            </p>
                                                            <p className="font-medium">
                                                                {format(
                                                                    new Date(transaction.issueDate),
                                                                    "MMM dd, yyyy"
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">
                                                                Due Date
                                                            </p>
                                                            <p className="font-medium">
                                                                {format(
                                                                    new Date(transaction.dueDate),
                                                                    "MMM dd, yyyy"
                                                                )}
                                                            </p>
                                                        </div>
                                                        {transaction.returnDate && (
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Return Date
                                                                </p>
                                                                <p className="font-medium">
                                                                    {format(
                                                                        new Date(transaction.returnDate),
                                                                        "MMM dd, yyyy"
                                                                    )}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Fine Info */}
                                                    {transaction.fineAmount > 0 && (
                                                        <div className="flex items-center gap-2 text-sm bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                                                            <DollarSign className="h-4 w-4 text-yellow-600" />
                                                            <span className="font-semibold text-yellow-900 dark:text-yellow-200">
                                                                Fine: ₹{transaction.fineAmount.toFixed(2)}
                                                            </span>
                                                            {transaction.finePaid && (
                                                                <Badge
                                                                    variant="default"
                                                                    className="ml-auto bg-green-500"
                                                                >
                                                                    Paid
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Remarks */}
                                                    {transaction.remarks && (
                                                        <div className="text-xs text-muted-foreground bg-background rounded p-2 border">
                                                            <span className="font-medium">Remarks:</span>{" "}
                                                            {transaction.remarks}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

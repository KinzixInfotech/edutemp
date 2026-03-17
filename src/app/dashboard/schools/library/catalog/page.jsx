"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    Loader2,
    Book,
    BookOpen,
    AlertCircle,
    DollarSign,
    Plus,
    Search,
    Copy,
    BookMarked,
    Trash2,
    Eye,
    Edit,
    MoreHorizontal,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    RotateCcw,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ─── Helper: format large numbers nicely ───────────────────────────────────────
function formatNumber(n) {
    if (n === undefined || n === null) return "0";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
}

// ─── Donut chart matching inventory page style ─────────────────────────────────
const AVAILABILITY_COLORS = ["#22c55e", "#ef4444"]; // green, red — same palette as inventory

function CopiesDonutChart({ availableCopies, issuedCopies, totalCopies }) {
    const data = [
        { name: "Available", value: availableCopies || 0 },
        { name: "Issued / Not Available", value: issuedCopies || 0 },
    ];

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const item = payload[0];
            const pct = totalCopies ? ((item.value / totalCopies) * 100).toFixed(1) : 0;
            return (
                <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-sm">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-muted-foreground">
                        {item.value.toLocaleString()} copies ({pct}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={AVAILABILITY_COLORS[index]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
            </ResponsiveContainer>

            {/* Legend — same style as inventory "By Payment Method" card */}
            <div className="w-full space-y-2 mt-1 px-2">
                {data.map((entry, index) => {
                    const pct = totalCopies ? ((entry.value / totalCopies) * 100).toFixed(1) : "0.0";
                    return (
                        <div key={entry.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <span
                                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: AVAILABILITY_COLORS[index] }}
                                />
                                <span className="text-muted-foreground">{entry.name}</span>
                            </div>
                            <span className="font-medium text-foreground">{pct}%</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function LibraryManagementPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    // State
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [isAddBookOpen, setIsAddBookOpen] = useState(false);
    const [isEditBookOpen, setIsEditBookOpen] = useState(false);
    const [editBookForm, setEditBookForm] = useState(null);
    const [isAddCopiesOpen, setIsAddCopiesOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);
    const [isRequestBookOpen, setIsRequestBookOpen] = useState(false);
    const [requestRemarks, setRequestRemarks] = useState("");

    // Delete state
    const [bookToDelete, setBookToDelete] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Table state
    const [sortColumn, setSortColumn] = useState("title");
    const [sortDirection, setSortDirection] = useState("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [bookForm, setBookForm] = useState({
        title: "",
        author: "",
        ISBN: "",
        category: "",
        publisher: "",
        edition: "",
        description: "",
        coverImage: "",
    });

    const [copiesForm, setCopiesForm] = useState({
        count: 1,
        startAccessionNumber: "",
        location: "General Shelf",
        condition: "GOOD",
    });

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ["library-stats", schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/library/stats`);
            return res.data;
        },
        enabled: !!schoolId,
    });

    // Fetch books with server-side pagination, sorting, and search
    const { data: booksResponse, isLoading, refetch } = useQuery({
        queryKey: ["library-books", schoolId, search, categoryFilter, currentPage, pageSize, sortColumn, sortDirection],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
            params.set("page", currentPage);
            params.set("limit", pageSize);
            params.set("sortColumn", sortColumn);
            params.set("sortDirection", sortDirection);

            const res = await axios.get(`/api/schools/${schoolId}/library/books?${params}`);
            return res.data;
        },
        enabled: !!schoolId,
        placeholderData: keepPreviousData,
    });

    const books = booksResponse?.data || [];
    const totalPages = booksResponse?.totalPages || 1;
    const totalBooks = booksResponse?.total || 0;

    // Add book mutation
    const addBookMutation = useMutation({
        mutationFn: async (data) => {
            return axios.post(`/api/schools/${schoolId}/library/books`, data);
        },
        onSuccess: () => {
            toast.success("Book added successfully");
            setIsAddBookOpen(false);
            queryClient.invalidateQueries(["library-books"]);
            queryClient.invalidateQueries(["library-stats"]);
            resetBookForm();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || "Failed to add book");
        },
    });

    // Add copies mutation
    const addCopiesMutation = useMutation({
        mutationFn: async ({ bookId, data }) => {
            return axios.post(`/api/schools/${schoolId}/library/books/${bookId}/copies`, data);
        },
        onSuccess: () => {
            toast.success(`${copiesForm.count} copies added successfully`);
            setIsAddCopiesOpen(false);
            queryClient.invalidateQueries(["library-books"]);
            queryClient.invalidateQueries(["library-stats"]);
            setCopiesForm({
                count: 1,
                startAccessionNumber: "",
                location: "General Shelf",
                condition: "GOOD",
            });
        },
        onError: () => {
            toast.error("Failed to add copies");
        },
    });

    // Request book mutation
    const requestBookMutation = useMutation({
        mutationFn: async (data) => {
            return axios.post(`/api/schools/${schoolId}/library/requests`, data);
        },
        onSuccess: () => {
            toast.success("Book request submitted successfully");
            setIsRequestBookOpen(false);
            setRequestRemarks("");
            setSelectedBook(null);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || "Failed to request book");
        },
    });

    // Edit book mutation
    const editBookMutation = useMutation({
        mutationFn: async (data) => {
            return axios.put(`/api/schools/${schoolId}/library/books/${data.id}`, data);
        },
        onMutate: async (updatedBook) => {
            await queryClient.cancelQueries({ queryKey: ["library-books"] });
            const previousData = queryClient.getQueryData(["library-books", schoolId, search, categoryFilter, currentPage, pageSize, sortColumn, sortDirection]);
            queryClient.setQueryData(
                ["library-books", schoolId, search, categoryFilter, currentPage, pageSize, sortColumn, sortDirection],
                (old) => {
                    if (!old || !old.data) return old;
                    return {
                        ...old,
                        data: old.data.map((book) =>
                            book.id === updatedBook.id ? { ...book, ...updatedBook } : book
                        ),
                    };
                }
            );
            return { previousData };
        },
        onError: (err, newBook, context) => {
            queryClient.setQueryData(
                ["library-books", schoolId, search, categoryFilter, currentPage, pageSize, sortColumn, sortDirection],
                context.previousData
            );
            toast.error(err.response?.data?.error || "Failed to edit book");
        },
        onSuccess: () => {
            toast.success("Book updated successfully");
            setIsEditBookOpen(false);
            queryClient.invalidateQueries({ queryKey: ["library-books"] });
            queryClient.invalidateQueries({ queryKey: ["library-stats"] });
        },
    });

    // Delete book mutation
    const deleteBookMutation = useMutation({
        mutationFn: async (bookId) => {
            return axios.delete(`/api/schools/${schoolId}/library/books/${bookId}`);
        },
        onSuccess: () => {
            toast.success("Book deleted successfully");
            setIsDeleteDialogOpen(false);
            setBookToDelete(null);
            queryClient.invalidateQueries(["library-books"]);
            queryClient.invalidateQueries(["library-stats"]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || "Failed to delete book");
        },
    });

    const resetBookForm = () => {
        setBookForm({
            title: "",
            author: "",
            ISBN: "",
            category: "",
            publisher: "",
            edition: "",
            description: "",
            coverImage: "",
        });
    };

    const clearAllFilters = () => {
        setSearch("");
        setCategoryFilter("all");
        setCurrentPage(1);
    };

    const categories = useMemo(() => {
        return [...new Set(books.map((b) => b.category).filter(Boolean))];
    }, [books]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const SortableHeader = ({ column, children }) => (
        <TableHead
            className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
            onClick={() => handleSort(column)}
        >
            <div className="flex items-center gap-1">
                {children}
                <ArrowUpDown className={`w-4 h-4 ${sortColumn === column ? "text-primary" : "text-muted-foreground/50"}`} />
            </div>
        </TableHead>
    );

    const getAvailabilityBadge = (available, total) => {
        if (available === 0) {
            return <Badge variant="destructive">Not Available</Badge>;
        }
        if (available < total / 2) {
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">{available} / {total}</Badge>;
        }
        return <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">{available} / {total}</Badge>;
    };

    const TableLoadingRows = () => (
        <>
            {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
            ))}
        </>
    );

    if (!schoolId) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Derived stats for chart
    const totalCopies = stats?.totalCopies || 0;
    const issuedCopies = stats?.issuedCopies || 0;
    const availableCopies = stats?.availableCopies || 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Book className="w-8 h-8 text-blue-600" />
                        Library Catalog
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage books, track issues, and monitor library operations
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Dialog open={isAddBookOpen} onOpenChange={setIsAddBookOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Book
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Add New Book</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Title *</Label>
                                    <Input
                                        value={bookForm.title}
                                        onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Author *</Label>
                                    <Input
                                        value={bookForm.author}
                                        onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>ISBN *</Label>
                                    <Input
                                        value={bookForm.ISBN}
                                        onChange={(e) => setBookForm({ ...bookForm, ISBN: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category *</Label>
                                    <Input
                                        value={bookForm.category}
                                        onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                                        placeholder="e.g., Fiction, Science, History"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Publisher</Label>
                                    <Input
                                        value={bookForm.publisher}
                                        onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Edition</Label>
                                    <Input
                                        value={bookForm.edition}
                                        onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Description</Label>
                                    <Input
                                        value={bookForm.description}
                                        onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Cover Image URL</Label>
                                    <Input
                                        value={bookForm.coverImage}
                                        onChange={(e) => setBookForm({ ...bookForm, coverImage: e.target.value })}
                                    />
                                </div>
                            </div>
                            <Button
                                onClick={() => addBookMutation.mutate(bookForm)}
                                className="w-full mt-4"
                                disabled={addBookMutation.isPending}
                            >
                                {addBookMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    "Add Book"
                                )}
                            </Button>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Separator />

            {/* ── Stats + Chart Row ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: 4 stat cards stacked 2×2 */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
                            <Book className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{(stats?.totalBooks || 0).toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {formatNumber(totalCopies)} total copies
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Books Issued</CardTitle>
                            <BookOpen className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{issuedCopies.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {formatNumber(availableCopies)} available
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Overdue Books</CardTitle>
                            <AlertCircle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{(stats?.overdueBooks || 0).toLocaleString()}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Fines Collected</CardTitle>
                            <DollarSign className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                ₹{stats?.totalFinesCollected?.toFixed(2) || "0.00"}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Copies Availability Donut Chart — matches inventory "By Payment Method" card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Copies Availability</CardTitle>
                        <CardDescription className="text-xs">
                            {formatNumber(totalCopies)} total copies
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {totalCopies === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
                                <Book className="w-8 h-8 opacity-30" />
                                <p>No copies yet</p>
                            </div>
                        ) : (
                            <CopiesDonutChart
                                availableCopies={availableCopies}
                                issuedCopies={issuedCopies}
                                totalCopies={totalCopies}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-none border">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by title, author, or ISBN..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                className="pl-10"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={clearAllFilters}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Data Table */}
            <Card className="border-0 shadow-none border">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Books ({totalBooks.toLocaleString()})</CardTitle>
                            <CardDescription>All books in the library catalog</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Rows per page:</span>
                            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="dark:bg-background/50 bg-muted/50">
                                    <SortableHeader column="title">Title</SortableHeader>
                                    <SortableHeader column="author">Author</SortableHeader>
                                    <TableHead>ISBN</TableHead>
                                    <SortableHeader column="category">Category</SortableHeader>
                                    <TableHead>Publisher</TableHead>
                                    <SortableHeader column="available">Availability</SortableHeader>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableLoadingRows />
                                ) : books.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2">
                                                <Book className="w-12 h-12 text-muted-foreground/50" />
                                                <p className="text-muted-foreground">No books found</p>
                                                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                                                    Clear filters
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    books.map((book, index) => (
                                        <TableRow key={book.id} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? "bg-muted dark:bg-background/50" : ""}`}>
                                            <TableCell className="font-medium">{book.title}</TableCell>
                                            <TableCell className="text-muted-foreground">{book.author}</TableCell>
                                            <TableCell className="text-muted-foreground font-mono text-xs">{book.ISBN}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {book.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{book.publisher || "-"}</TableCell>
                                            <TableCell>{getAvailabilityBadge(book.availableCopies, book.totalCopies)}</TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/dashboard/schools/library/catalog/${book.id}`}>
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                View Details
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedBook(book);
                                                            setIsAddCopiesOpen(true);
                                                        }}>
                                                            <Copy className="w-4 h-4 mr-2" />
                                                            Add Copies
                                                        </DropdownMenuItem>
                                                        {book.availableCopies === 0 && (
                                                            <DropdownMenuItem onClick={() => {
                                                                setSelectedBook(book);
                                                                setIsRequestBookOpen(true);
                                                            }}>
                                                                <BookMarked className="w-4 h-4 mr-2" />
                                                                Request Book
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedBook(book);
                                                            setEditBookForm({
                                                                id: book.id,
                                                                title: book.title || "",
                                                                author: book.author || "",
                                                                ISBN: book.ISBN || "",
                                                                category: book.category || "",
                                                                publisher: book.publisher || "",
                                                                edition: book.edition || "",
                                                                description: book.description || "",
                                                                coverImage: book.coverImage || "",
                                                            });
                                                            setIsEditBookOpen(true);
                                                        }}>
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600"
                                                            onClick={() => {
                                                                setBookToDelete(book);
                                                                setIsDeleteDialogOpen(true);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalBooks)} of {totalBooks.toLocaleString()} books
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setCurrentPage(pageNum)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Book Dialog */}
            <Dialog open={isEditBookOpen} onOpenChange={setIsEditBookOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Book</DialogTitle>
                    </DialogHeader>
                    {editBookForm && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Title *</Label>
                                <Input
                                    value={editBookForm.title}
                                    onChange={(e) => setEditBookForm({ ...editBookForm, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Author *</Label>
                                <Input
                                    value={editBookForm.author}
                                    onChange={(e) => setEditBookForm({ ...editBookForm, author: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 col-span-2 sm:col-span-1">
                                <Label>Category</Label>
                                <Input
                                    value={editBookForm.category}
                                    onChange={(e) => setEditBookForm({ ...editBookForm, category: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Publisher</Label>
                                <Input
                                    value={editBookForm.publisher}
                                    onChange={(e) => setEditBookForm({ ...editBookForm, publisher: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Edition</Label>
                                <Input
                                    value={editBookForm.edition}
                                    onChange={(e) => setEditBookForm({ ...editBookForm, edition: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={editBookForm.description}
                                    onChange={(e) => setEditBookForm({ ...editBookForm, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Cover Image URL</Label>
                                <Input
                                    value={editBookForm.coverImage}
                                    onChange={(e) => setEditBookForm({ ...editBookForm, coverImage: e.target.value })}
                                />
                            </div>
                        </div>
                    )}
                    <Button
                        onClick={() => editBookMutation.mutate(editBookForm)}
                        className="w-full mt-4"
                        disabled={editBookMutation.isPending}
                    >
                        {editBookMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </Button>
                </DialogContent>
            </Dialog>

            {/* Add Copies Dialog */}
            <Dialog open={isAddCopiesOpen} onOpenChange={setIsAddCopiesOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Copies - {selectedBook?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Number of Copies</Label>
                            <Input
                                type="number"
                                min="1"
                                value={copiesForm.count}
                                onChange={(e) =>
                                    setCopiesForm({ ...copiesForm, count: parseInt(e.target.value) })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Starting Accession Number</Label>
                            <Input
                                value={copiesForm.startAccessionNumber}
                                onChange={(e) =>
                                    setCopiesForm({ ...copiesForm, startAccessionNumber: e.target.value })
                                }
                                placeholder="e.g., ACC-001"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                                value={copiesForm.location}
                                onChange={(e) =>
                                    setCopiesForm({ ...copiesForm, location: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Condition</Label>
                            <Select
                                value={copiesForm.condition}
                                onValueChange={(value) =>
                                    setCopiesForm({ ...copiesForm, condition: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NEW">New</SelectItem>
                                    <SelectItem value="GOOD">Good</SelectItem>
                                    <SelectItem value="FAIR">Fair</SelectItem>
                                    <SelectItem value="POOR">Poor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            onClick={() => addCopiesMutation.mutate({ bookId: selectedBook?.id, data: copiesForm })}
                            className="w-full"
                            disabled={addCopiesMutation.isPending}
                        >
                            {addCopiesMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                `Add ${copiesForm.count} ${copiesForm.count === 1 ? "Copy" : "Copies"}`
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Request Book Dialog */}
            <Dialog open={isRequestBookOpen} onOpenChange={setIsRequestBookOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Book</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                            <p className="font-semibold">{selectedBook?.title}</p>
                            <p className="text-sm text-muted-foreground">by {selectedBook?.author}</p>
                            <p className="text-xs text-orange-600 font-medium">
                                No copies currently available
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Remarks (Optional)</Label>
                            <Textarea
                                value={requestRemarks}
                                onChange={(e) => setRequestRemarks(e.target.value)}
                                placeholder="Any additional notes..."
                                rows={3}
                            />
                        </div>
                        <Button
                            onClick={() => requestBookMutation.mutate({
                                bookId: selectedBook?.id,
                                userId: fullUser?.id,
                                userType: fullUser?.role === "STUDENT" ? "STUDENT" : "TEACHER",
                                remarks: requestRemarks,
                            })}
                            disabled={requestBookMutation.isPending}
                            className="w-full"
                        >
                            {requestBookMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit Request"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the book
                            &quot;{bookToDelete?.title}&quot; and all its copies from the library.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteBookMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                deleteBookMutation.mutate(bookToDelete?.id);
                            }}
                            disabled={deleteBookMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteBookMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
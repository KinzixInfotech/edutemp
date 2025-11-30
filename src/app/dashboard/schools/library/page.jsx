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
    DialogTrigger,
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
    Book,
    BookOpen,
    AlertCircle,
    DollarSign,
    Plus,
    Search,
    Copy,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function LibraryManagementPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [stats, setStats] = useState(null);
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [isAddBookOpen, setIsAddBookOpen] = useState(false);
    const [isAddCopiesOpen, setIsAddCopiesOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);

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

    useEffect(() => {
        if (schoolId) {
            fetchData();
        }
    }, [schoolId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, booksRes] = await Promise.all([
                axios.get(`/api/schools/${schoolId}/library/stats`),
                axios.get(`/api/schools/${schoolId}/library/books`),
            ]);

            setStats(statsRes.data);
            setBooks(booksRes.data.data);
        } catch (error) {
            console.error("Failed to fetch library data", error);
            toast.error("Failed to load library data");
        } finally {
            setLoading(false);
        }
    };

    const handleAddBook = async () => {
        try {
            await axios.post(`/api/schools/${schoolId}/library/books`, bookForm);
            toast.success("Book added successfully");
            setIsAddBookOpen(false);
            fetchData();
            resetBookForm();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to add book");
        }
    };

    const handleAddCopies = async () => {
        try {
            await axios.post(
                `/api/schools/${schoolId}/library/books/${selectedBook.id}/copies`,
                copiesForm
            );
            toast.success(`${copiesForm.count} copies added successfully`);
            setIsAddCopiesOpen(false);
            fetchData();
            setCopiesForm({
                count: 1,
                startAccessionNumber: "",
                location: "General Shelf",
                condition: "GOOD",
            });
        } catch (error) {
            toast.error("Failed to add copies");
        }
    };

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

    const filteredBooks = books.filter((book) => {
        const matchesSearch =
            book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
            book.ISBN.includes(searchTerm);
        const matchesCategory = !categoryFilter || book.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = [...new Set(books.map((b) => b.category))];

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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Library Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage books, track issues, and monitor library operations
                    </p>
                </div>
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
                            <div>
                                <Label>Title *</Label>
                                <Input
                                    value={bookForm.title}
                                    onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Author *</Label>
                                <Input
                                    value={bookForm.author}
                                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>ISBN *</Label>
                                <Input
                                    value={bookForm.ISBN}
                                    onChange={(e) => setBookForm({ ...bookForm, ISBN: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Category *</Label>
                                <Input
                                    value={bookForm.category}
                                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                                    placeholder="e.g., Fiction, Science, History"
                                />
                            </div>
                            <div>
                                <Label>Publisher</Label>
                                <Input
                                    value={bookForm.publisher}
                                    onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Edition</Label>
                                <Input
                                    value={bookForm.edition}
                                    onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <Label>Description</Label>
                                <Input
                                    value={bookForm.description}
                                    onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <Label>Cover Image URL</Label>
                                <Input
                                    value={bookForm.coverImage}
                                    onChange={(e) => setBookForm({ ...bookForm, coverImage: e.target.value })}
                                />
                            </div>
                        </div>
                        <Button onClick={handleAddBook} className="w-full mt-4">
                            Add Book
                        </Button>
                    </DialogContent>
                </Dialog>
            </div>

            <Separator />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Books</CardTitle>
                        <Book className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalBooks || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats?.totalCopies || 0} total copies
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Books Issued</CardTitle>
                        <BookOpen className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats?.issuedCopies || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats?.availableCopies || 0} available
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Overdue Books</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats?.overdueBooks || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Fines Collected</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ₹{stats?.totalFinesCollected?.toFixed(2) || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Books Catalog */}
            <Card>
                <CardHeader>
                    <CardTitle>Book Catalog</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search by title, author, or ISBN..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Categories</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredBooks.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">No books found</div>
                    ) : (
                        <div className="space-y-4">
                            {filteredBooks.map((book) => (
                                <div
                                    key={book.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold">{book.title}</h3>
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                {book.category}
                                            </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            by {book.author} • ISBN: {book.ISBN}
                                        </div>
                                        {book.publisher && (
                                            <div className="text-sm text-muted-foreground">
                                                Published by {book.publisher}
                                                {book.edition && ` • ${book.edition} Edition`}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-4 mt-2 text-sm">
                                            <span className="text-green-600 font-medium">
                                                {book.availableCopies} available
                                            </span>
                                            <span className="text-muted-foreground">
                                                {book.totalCopies} total copies
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Dialog
                                            open={isAddCopiesOpen && selectedBook?.id === book.id}
                                            onOpenChange={(open) => {
                                                setIsAddCopiesOpen(open);
                                                if (open) setSelectedBook(book);
                                            }}
                                        >
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm">
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Add Copies
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Add Copies - {book.title}</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <div>
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
                                                    <div>
                                                        <Label>Starting Accession Number</Label>
                                                        <Input
                                                            value={copiesForm.startAccessionNumber}
                                                            onChange={(e) =>
                                                                setCopiesForm({ ...copiesForm, startAccessionNumber: e.target.value })
                                                            }
                                                            placeholder="e.g., ACC-001"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label>Location</Label>
                                                        <Input
                                                            value={copiesForm.location}
                                                            onChange={(e) =>
                                                                setCopiesForm({ ...copiesForm, location: e.target.value })
                                                            }
                                                        />
                                                    </div>
                                                    <div>
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
                                                    <Button onClick={handleAddCopies} className="w-full">
                                                        Add {copiesForm.count} {copiesForm.count === 1 ? "Copy" : "Copies"}
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
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
        </div>
    );
}

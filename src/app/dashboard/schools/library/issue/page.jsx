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
    Search,
    User,
    Check,
    History,
    Filter,
    X,
    Book,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebounce } from "use-debounce";

export default function LibraryTransactionsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [books, setBooks] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedCopy, setSelectedCopy] = useState(null);
    const [copies, setCopies] = useState([]);

    // Book Search State
    const [bookSearchQuery, setBookSearchQuery] = useState("");
    const [debouncedBookQuery] = useDebounce(bookSearchQuery, 300);
    const [bookSearchResults, setBookSearchResults] = useState([]);
    const [isSearchingBooks, setIsSearchingBooks] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);

    // Filters for Student Search
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [selectedClass, setSelectedClass] = useState("ALL");
    const [selectedSection, setSelectedSection] = useState("ALL");

    // User Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery] = useDebounce(searchQuery, 300);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [recentSearches, setRecentSearches] = useState([]);

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
            fetchClasses();
            loadRecentSearches();
        }
    }, [schoolId]);

    // Search Books Effect
    useEffect(() => {
        const searchBooks = async () => {
            if (!debouncedBookQuery || debouncedBookQuery.length < 2) {
                setBookSearchResults([]);
                return;
            }

            setIsSearchingBooks(true);
            try {
                const res = await axios.get(
                    `/api/schools/${schoolId}/library/books?search=${debouncedBookQuery}`
                );
                setBookSearchResults(res.data || []);
            } catch (error) {
                console.error("Book search error:", error);
            } finally {
                setIsSearchingBooks(false);
            }
        };

        searchBooks();
    }, [debouncedBookQuery, schoolId]);

    // Load recent searches from local storage
    const loadRecentSearches = () => {
        const saved = localStorage.getItem(`library_recent_searches_${schoolId}`);
        if (saved) {
            setRecentSearches(JSON.parse(saved));
        }
    };

    // Save user to recent searches
    const addToRecentSearches = (user) => {
        let updated = [user, ...recentSearches.filter((u) => u.id !== user.id)];
        updated = updated.slice(0, 5); // Keep last 5
        setRecentSearches(updated);
        localStorage.setItem(
            `library_recent_searches_${schoolId}`,
            JSON.stringify(updated)
        );
    };

    const fetchClasses = async () => {
        try {
            const res = await axios.get(`/api/schools/${schoolId}/classes`);
            setClasses(res.data || []);
        } catch (error) {
            console.error("Failed to fetch classes", error);
        }
    };

    const fetchSections = async (classId) => {
        if (classId === "ALL") {
            setSections([]);
            return;
        }
        try {
            const res = await axios.get(
                `/api/schools/${schoolId}/classes/${classId}/sections`
            );
            setSections(res.data || []);
        } catch (error) {
            console.error("Failed to fetch sections", error);
        }
    };

    // Search Users Effect
    useEffect(() => {
        const searchUsers = async () => {
            // If query is empty and no filters, show defaults based on type
            if (
                !debouncedQuery &&
                issueForm.userType === "STUDENT" &&
                selectedClass === "ALL" &&
                selectedSection === "ALL"
            ) {
                setSearchResults([]); // Show recent searches instead
                return;
            }

            setIsSearching(true);
            try {
                let url = `/api/schools/${schoolId}/library/users/search?type=${issueForm.userType}`;
                if (debouncedQuery) url += `&query=${debouncedQuery}`;
                if (issueForm.userType === "STUDENT") {
                    if (selectedClass !== "ALL") url += `&classId=${selectedClass}`;
                    if (selectedSection !== "ALL") url += `&sectionId=${selectedSection}`;
                }

                const res = await axios.get(url);
                setSearchResults(res.data);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        };

        searchUsers();
    }, [
        debouncedQuery,
        schoolId,
        issueForm.userType,
        selectedClass,
        selectedSection,
    ]);

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
            if (!issueForm.userId) {
                toast.error("Please select a user");
                return;
            }
            if (!issueForm.copyId) {
                toast.error("Please select a book copy");
                return;
            }

            await axios.post(
                `/api/schools/${schoolId}/library/transactions/issue`,
                issueForm
            );
            toast.success("Book issued successfully");
            fetchData();
            setIssueForm({
                copyId: "",
                userId: "",
                userType: "STUDENT",
                dueDate: "",
            });
            setSelectedUser(null);
            setSearchQuery("");
            setSearchResults([]);
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
                <h1 className="text-3xl font-bold tracking-tight">
                    Issue & Return Books
                </h1>
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
                                <p className="font-semibold">
                                    {settings.maxBooksStudent} books
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Teacher Limit</p>
                                <p className="font-semibold">
                                    {settings.maxBooksTeacher} books
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Student Duration</p>
                                <p className="font-semibold">
                                    {settings.issueDaysStudent} days
                                </p>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column: Book Selection */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Search Book</Label>
                                        <div className="relative">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search by title, author, or ISBN..."
                                                className="pl-8"
                                                value={bookSearchQuery}
                                                onChange={(e) => setBookSearchQuery(e.target.value)}
                                            />
                                            {bookSearchQuery && (
                                                <button
                                                    onClick={() => {
                                                        setBookSearchQuery("");
                                                        setBookSearchResults([]);
                                                    }}
                                                    className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Selected Book Display */}
                                        {selectedBook ? (
                                            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-sm">{selectedBook.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        by {selectedBook.author} • {selectedBook.availableCopies} available
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0"
                                                    onClick={() => {
                                                        setSelectedBook(null);
                                                        setCopies([]);
                                                        setIssueForm({ ...issueForm, copyId: "" });
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="border rounded-md min-h-[120px] p-2 bg-muted/20">
                                                <ScrollArea className="h-[120px]">
                                                    {isSearchingBooks ? (
                                                        <div className="flex items-center justify-center h-full">
                                                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                                        </div>
                                                    ) : bookSearchResults.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {bookSearchResults
                                                                .filter((b) => b.availableCopies > 0)
                                                                .map((book) => (
                                                                    <div
                                                                        key={book.id}
                                                                        className="flex items-center gap-2 p-2 hover:bg-background rounded-md cursor-pointer transition-colors"
                                                                        onClick={() => {
                                                                            setSelectedBook(book);
                                                                            fetchCopies(book.id);
                                                                            setBookSearchQuery("");
                                                                            setBookSearchResults([]);
                                                                        }}
                                                                    >
                                                                        <div className="flex-1">
                                                                            <p className="font-medium text-sm">{book.title}</p>
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {book.author} • {book.availableCopies} available
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    ) : bookSearchQuery.length > 0 ? (
                                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                                                            <Book className="h-8 w-8 mb-2 opacity-20" />
                                                            <p>No books found</p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                                                            <Search className="h-8 w-8 mb-2 opacity-20" />
                                                            <p>Type to search books</p>
                                                        </div>
                                                    )}
                                                </ScrollArea>
                                            </div>
                                        )}
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

                                {/* Right Column: User Selection */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>User Type</Label>
                                        <Select
                                            value={issueForm.userType}
                                            onValueChange={(value) => {
                                                setIssueForm({
                                                    ...issueForm,
                                                    userType: value,
                                                    userId: "",
                                                });
                                                setSelectedUser(null);
                                                setSearchQuery("");
                                                setSearchResults([]);
                                                setSelectedClass("ALL");
                                                setSelectedSection("ALL");
                                            }}
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

                                    {/* Class/Section Filters for Students */}
                                    {issueForm.userType === "STUDENT" && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Class</Label>
                                                <Select
                                                    value={selectedClass}
                                                    onValueChange={(val) => {
                                                        setSelectedClass(val);
                                                        fetchSections(val);
                                                        setSelectedSection("ALL");
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue placeholder="All" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ALL">All Classes</SelectItem>
                                                        {classes.map((c) => (
                                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                                {c.className}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Section</Label>
                                                <Select
                                                    value={selectedSection}
                                                    onValueChange={setSelectedSection}
                                                    disabled={selectedClass === "ALL"}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue placeholder="All" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ALL">All Sections</SelectItem>
                                                        {sections.map((s) => (
                                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                                {s.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label>Search User</Label>
                                        <div className="relative">
                                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder={
                                                    issueForm.userType === "STUDENT"
                                                        ? "Search student name, roll no..."
                                                        : "Search name, employee ID..."
                                                }
                                                className="pl-8"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                            {searchQuery && (
                                                <button
                                                    onClick={() => setSearchQuery("")}
                                                    className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Search Results / Selected User */}
                                    <div className="border rounded-md min-h-[240px] p-2 bg-muted/20">
                                        {selectedUser ? (
                                            <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                                                <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                                                    <AvatarImage src={selectedUser.image} />
                                                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                        {selectedUser.name
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .join("")
                                                            .slice(0, 2)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-sm">
                                                        {selectedUser.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                                        {selectedUser.identifier}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {selectedUser.details}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                                                    onClick={() => {
                                                        setSelectedUser(null);
                                                        setIssueForm({ ...issueForm, userId: "" });
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <ScrollArea className="h-[240px]">
                                                {isSearching ? (
                                                    <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                                                        <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                                        <p className="text-xs">Searching...</p>
                                                    </div>
                                                ) : searchResults.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {searchResults.map((user) => (
                                                            <div
                                                                key={user.id}
                                                                className="flex items-center gap-3 p-2 hover:bg-background hover:shadow-sm rounded-md cursor-pointer transition-all border border-transparent hover:border-border"
                                                                onClick={() => {
                                                                    setSelectedUser(user);
                                                                    setIssueForm({
                                                                        ...issueForm,
                                                                        userId: user.id,
                                                                    });
                                                                    addToRecentSearches(user);
                                                                    setSearchQuery("");
                                                                    setSearchResults([]);
                                                                }}
                                                            >
                                                                <Avatar className="h-9 w-9 border border-border">
                                                                    <AvatarImage src={user.image} />
                                                                    <AvatarFallback className="text-xs">
                                                                        {user.name
                                                                            .split(" ")
                                                                            .map((n) => n[0])
                                                                            .join("")
                                                                            .slice(0, 2)
                                                                            .toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-1 overflow-hidden">
                                                                    <p className="font-medium text-sm truncate">
                                                                        {user.name}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground truncate">
                                                                        {user.identifier} • {user.details}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : searchQuery.length > 0 ? (
                                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                                                        <User className="h-8 w-8 mb-2 opacity-20" />
                                                        <p>No users found</p>
                                                    </div>
                                                ) : (
                                                    // Empty State / Recent Searches
                                                    <div className="space-y-4">
                                                        {recentSearches.length > 0 &&
                                                            issueForm.userType === "STUDENT" && (
                                                                <div>
                                                                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                                                                        <History className="h-3 w-3" />
                                                                        Recent Searches
                                                                    </div>
                                                                    <div className="space-y-1 mt-1">
                                                                        {recentSearches.map((user) => (
                                                                            <div
                                                                                key={user.id}
                                                                                className="flex items-center gap-3 p-2 hover:bg-background hover:shadow-sm rounded-md cursor-pointer transition-all opacity-75 hover:opacity-100"
                                                                                onClick={() => {
                                                                                    setSelectedUser(user);
                                                                                    setIssueForm({
                                                                                        ...issueForm,
                                                                                        userId: user.id,
                                                                                    });
                                                                                }}
                                                                            >
                                                                                <Avatar className="h-8 w-8">
                                                                                    <AvatarImage src={user.image} />
                                                                                    <AvatarFallback className="text-[10px]">
                                                                                        {user.name.charAt(0)}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <div className="flex-1 overflow-hidden">
                                                                                    <p className="font-medium text-sm truncate">
                                                                                        {user.name}
                                                                                    </p>
                                                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                                                        {user.identifier}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                        {issueForm.userType !== "STUDENT" && (
                                                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                                                                <Search className="h-8 w-8 mb-2 opacity-20" />
                                                                <p>Type to search or see list</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </ScrollArea>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleIssueBook}
                                className="mt-6 w-full"
                                disabled={!issueForm.userId || !issueForm.copyId}
                            >
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
                                            setReturnForm({
                                                ...returnForm,
                                                transactionId: e.target.value,
                                            })
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
                                            <p className="font-medium text-yellow-900">
                                                Automatic Fine Calculation
                                            </p>
                                            <p className="text-yellow-700 mt-1">
                                                If the book is returned after the due date, a fine of ₹
                                                {settings?.finePerDay || 5} per day will be
                                                automatically calculated.
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
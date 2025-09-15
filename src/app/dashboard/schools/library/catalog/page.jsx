// pages/library/catalog.jsx
'use client'
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
// import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";



async function fetchBooks({ schoolId, search, filter }) {
    const params = new URLSearchParams({ schoolId });
    if (search) params.append("search", search);
    if (filter.category) params.append("category", filter.category);
    if (filter.status) params.append("status", filter.status);
    const response = await fetch(`/api/schools/library/books?${params}`);
    if (!response.ok) throw new Error("Failed to fetch books");
    return response.json();
}

async function createBook(data) {
    const response = await fetch("/api/schools/library/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create book");
    return response.json();
}

async function updateBook({ id, ...data }) {
    const response = await fetch(`/api/schools/library/books/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update book");
    return response.json();
}

async function deleteBook(id) {
    const response = await fetch(`/api/schools/library/books/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete book");
    return response.json();
}

async function fetchHistory(userId) {
    const response = await fetch(`/api/schools/library/history?userId=${userId}`);
    if (!response.ok) throw new Error("Failed to fetch history");
    return response.json();
}

export default function LibraryCatalog() {
    const { fullUser } = useAuth()
    const [drawerMode, setDrawerMode] = useState(null);
    const [formData, setFormData] = useState({});
    const [selectedBook, setSelectedBook] = useState(null);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState({ category: "", status: "" });
    const [formError, setFormError] = useState("");

    const queryClient = useQueryClient();

    const schoolId = fullUser?.schoolId; // Replace with actual schoolId from auth/context

    const { data: books, isLoading: loading } = useQuery({
        queryKey: ["books", schoolId, search, filter],
        queryFn: () => fetchBooks({ schoolId, search, filter }),
        staleTime: 5 * 60 * 1000, // 5 minutes stale time
    });

    const { data: history, isLoading: txLoading } = useQuery({
        queryKey: ["history", selectedBook?.issuedToId],
        queryFn: () => fetchHistory(selectedBook?.issuedToId),
        enabled: !!selectedBook?.issuedToId,
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: createBook,
        onSuccess: () => {
            queryClient.invalidateQueries(["books"]);
            setDrawerMode(null);
            // toast({ title: "Book added successfully" });
            toast.success("Book added successfully");
        },
        onError: () => toast.error("Failed To Add Book"),
    });

    const updateMutation = useMutation({
        mutationFn: updateBook,
        onSuccess: () => {
            queryClient.invalidateQueries(["books"]);
            setDrawerMode(null);
            // toast({ title: "Book updated successfully" });
            toast.success("Book updated successfully");

        },
        onError: () => toast.error("Failed To Update Book"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteBook,
        onSuccess: () => {
            queryClient.invalidateQueries(["books"]);
            toast.success("Book deleted successfully");

        },
        onError: () => toast.error("Failed To Delete Book"),
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name, val) => {
        setFormData({ ...formData, [name]: val });
    };

    const handleSubmit = () => {
        if (!formData.title || !formData.ISBN || !formData.author || !formData.publisher || !formData.category) {
            setFormError("Required fields missing");
            return;
        }
        formData.schoolId = schoolId;
        if (drawerMode === "add") {
            createMutation.mutate(formData);
        } else {
            updateMutation.mutate({ id: formData.id, ...formData });
        }
    };

    const handleAdd = () => {
        setFormData({});
        setDrawerMode("add");
    };

    const handleEdit = (book) => {
        setFormData(book);
        setDrawerMode("edit");
    };

    const handleDelete = (id) => {
        deleteMutation.mutate(id);
    };

    return (
        <div className="p-6">
            <Button onClick={handleAdd} className="mb-4">Add Book</Button>
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />
            <div className="flex gap-4 mb-4">
                <div>
                    <Label htmlFor="category" className='mb-2'>Category</Label>
                    <Input id="category" value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })} />
                </div>
                <div>
                    <Label htmlFor="status" className='mb-2'>Status</Label>
                    <Select value={filter.status} onValueChange={(val) => setFilter({ ...filter, status: val })}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="issued">Issued</SelectItem>
                            <SelectItem value="reserved">Reserved</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="bg-muted sticky top-0 z-10">
                            <TableHead>#</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>ISBN</TableHead>
                            <TableHead>Author</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array(6).fill(0).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                </TableRow>
                            ))
                        ) : books?.length > 0 ? (
                            books.map((book, index) => (
                                <TableRow key={book.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{book.title}</TableCell>
                                    <TableCell>{book.ISBN}</TableCell>
                                    <TableCell>{book.author}</TableCell>
                                    <TableCell>
                                        <span
                                            className={`px-2 py-1 rounded-sm text-sm font-medium ${book.status === "available" ? "bg-green-100 text-green-800" :
                                                book.status === "issued" ? "bg-yellow-100 text-yellow-800" :
                                                    book.status === "reserved" ? "bg-blue-100 text-blue-800" :
                                                        "bg-red-100 text-red-800"
                                                }`}
                                        >
                                            {book.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="flex flex-row gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" onClick={() => setSelectedBook(book)}>
                                                    View History
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl">
                                                <DialogHeader>
                                                    <DialogTitle>History - {selectedBook?.title}</DialogTitle>
                                                </DialogHeader>
                                                {txLoading ? (
                                                    <p className="text-center py-4">Loading history...</p>
                                                ) : history?.length > 0 ? (
                                                    <div className="overflow-x-auto rounded-lg border">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="bg-muted">
                                                                    <TableHead>Issued To</TableHead>
                                                                    <TableHead>Issued At</TableHead>
                                                                    <TableHead>Due At</TableHead>
                                                                    <TableHead>Fine</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {history.map((tx, idx) => (
                                                                    <TableRow key={idx} className={idx % 2 === 0 ? "bg-muted" : "bg-background"}>
                                                                        <TableCell>{tx.issuedTo?.name || "N/A"}</TableCell>
                                                                        <TableCell>{tx.issuedAt ? new Date(tx.issuedAt).toLocaleDateString() : "N/A"}</TableCell>
                                                                        <TableCell>{tx.dueAt ? new Date(tx.dueAt).toLocaleDateString() : "N/A"}</TableCell>
                                                                        <TableCell>{tx.fineAmount || 0}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ) : (
                                                    <p className="text-center py-4">No history found.</p>
                                                )}
                                            </DialogContent>
                                        </Dialog>
                                        <Button size="sm" variant="outline" onClick={() => handleEdit(book)}>
                                            Edit
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(book.id)}>
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4">No books found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Drawer open={!!drawerMode} onOpenChange={() => setDrawerMode(null)} direction="right">
                <DrawerContent className="w-[400px] flex flex-col h-full">
                    <DrawerHeader>
                        <DrawerTitle>{drawerMode === "add" ? "Add Book" : "Edit Book"}</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 flex-1 overflow-y-auto">
                        {formError && <p className="text-red-500 mb-4">{formError}</p>}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="title" className="mb-2 text-muted-foreground">Title*</Label>
                                <Input id="title" name="title" value={formData.title || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label htmlFor="ISBN" className="mb-2 text-muted-foreground">ISBN*</Label>
                                <Input id="ISBN" name="ISBN" value={formData.ISBN || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label htmlFor="author" className="mb-2 text-muted-foreground">Author*</Label>
                                <Input id="author" name="author" value={formData.author || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label htmlFor="publisher" className="mb-2 text-muted-foreground">Publisher*</Label>
                                <Input id="publisher" name="publisher" value={formData.publisher || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label htmlFor="edition" className="mb-2 text-muted-foreground">Edition</Label>
                                <Input id="edition" name="edition" value={formData.edition || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label htmlFor="category" className="mb-2 text-muted-foreground">Category*</Label>
                                <Input id="category" name="category" value={formData.category || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label htmlFor="status" className="mb-2 text-muted-foreground">Status*</Label>
                                <Select value={formData.status || "available"} onValueChange={(val) => handleSelectChange("status", val)}>
                                    <SelectTrigger className='w-full'>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="available">Available</SelectItem>
                                        <SelectItem value="issued">Issued</SelectItem>
                                        <SelectItem value="reserved">Reserved</SelectItem>
                                        <SelectItem value="damaged">Damaged</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button onClick={handleSubmit} className="mt-6 w-full">
                            Save
                        </Button>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
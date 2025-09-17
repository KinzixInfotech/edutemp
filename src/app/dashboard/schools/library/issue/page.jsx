// app/library/admin-issue/page.js
// Admin Global Issue Page

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

async function fetchAvailableBooks(schoolId) {
    const params = new URLSearchParams({ schoolId });
    const response = await fetch(`/api/schools/library/books?${params}`);
    if (!response.ok) {
        throw new Error((await response.json()).error || "Failed to fetch books");
    }
    return response.json();
}

async function fetchUsers() {
    const response = await fetch("/api/schools/library/users");
    if (!response.ok) {
        throw new Error((await response.json()).error || "Failed to fetch users");
    }
    return (await response.json()).users;
}

async function issueBook(data) {
    const response = await fetch("/api/schools/library/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        throw new Error((await response.json()).error || "Failed to issue book");
    }
    return (await response.json()).book;
}

export default function AdminIssueBookPage() {
    const { fullUser } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedBook, setSelectedBook] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
    const [charges, setCharges] = useState(0); // For any initial charges or fines

    // if (authLoading) {
    //     return <p>Loading...</p>;
    // }

    // if (!fullUser || fullUser.role !== "Admin") {
    //     toast({ title: "Access denied", variant: "destructive" });
    //     router.push("/library");
    //     return null;
    // }

    const schoolId = fullUser?.schoolId;

    const { data: books, isLoading: booksLoading } = useQuery({
        queryKey: ["availableBooks", schoolId],
        queryFn: () => fetchAvailableBooks(schoolId),
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    const { data: users, isLoading: usersLoading } = useQuery({
        queryKey: ["users"],
        queryFn: fetchUsers,
        staleTime: 5 * 60 * 1000,
    });
    console.log(users);


    const mutation = useMutation({
        mutationFn: issueBook,
        onSuccess: () => {
            queryClient.invalidateQueries(["availableBooks"]);
            queryClient.invalidateQueries(["history"]);
            // toast({ title: "Book issued successfully" });
            toast.success('Book Issued Successfully');
            setOpenDialog(false);
            setSelectedBook(null);
            setSelectedUserId("");
        },
        onError: (error) => {
            toast.error(`Failed To Issue Book  ${error.message}`);

        },
    });

    const handleOpenIssue = (book) => {
        setSelectedBook(book);
        setOpenDialog(true);
        setIssueDate(new Date().toISOString().split("T")[0]);
        setDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
        setCharges(0);
    };

    const handleIssue = () => {
        if (!selectedBook?.id || !selectedUserId) {
            // toast({ title: "Please select a user", variant: "destructive" });
            toast.error('Please Select A User');
            return;
        }

        const issuedAt = new Date(issueDate).toISOString();
        const dueAt = new Date(dueDate).toISOString();

        mutation.mutate({ bookId: selectedBook.id, issuedToId: selectedUserId, issuedAt, dueAt, fineAmount: charges, role: fullUser?.role.name });
    };
    const selectedUser = users?.find(user => user.id === selectedUserId);
    return (
        <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Admin Issue Book</h2>

            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-full">
                    <TableHeader>
                        <TableRow className="bg-muted sticky top-0 z-10">
                            <TableHead>#</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Author</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {booksLoading ? (
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
                                    <TableCell >{index + 1}</TableCell>
                                    <TableCell >{book.title}</TableCell>
                                    <TableCell >{book.author}</TableCell>
                                    <TableCell >{book.category}</TableCell>
                                    <TableCell >
                                        <span
                                            className={`px-2 py-1 rounded-sm capitalize text-sm font-medium ${book.status === "available" ? "bg-green-100 text-green-800" :
                                                book.status === "issued" ? "bg-yellow-100 text-yellow-800" :
                                                    book.status === "reserved" ? "bg-blue-100 text-blue-800" :
                                                        "bg-red-100 text-red-800"
                                                }`}
                                        >
                                            {book.status}
                                        </span>
                                    </TableCell>
                                    <TableCell >
                                        {book.status === "available" && (
                                            <Button size="sm" onClick={() => handleOpenIssue(book)}>
                                                Issue
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4">No available books found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Issue Book: {selectedBook?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 flex flex-col">
                        {/* Book details */}
                        <div className="inline-flex gap-1 ">
                            <Label>Author:</Label>
                            <p className='border-b'>{selectedBook?.author}</p>
                        </div>
                        <div className="inline-flex gap-1 ">
                            <Label>Category:</Label>
                            <p className='border-b'>{selectedBook?.category}</p>
                        </div>
                        {/* User select */}
                        <div>
                            <Label htmlFor="user-select">Select User</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger id="user-select" className='mt-2 w-full'>
                                    <SelectValue placeholder="Choose a user" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users?.length > 0 && users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {user.name || user.email} ({user.role.name})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {usersLoading && <p>Loading users...</p>}
                            {selectedUser && (
                                <div className="space-y-2 mt-2 p-4 border rounded-md bg-muted/50">
                                    <h3 className="font-semibold">User Profile</h3>
                                    {/* <img src={selectedUser.profilePicture} className="w-32 h-32"/> */}
                                    <div className="flex items-center justify-center">
                                        <Avatar className='w-36 h-36'>
                                            <AvatarImage src={selectedUser.profilePicture} />
                                            <AvatarFallback>{selectedUser.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div >
                                            <p><strong>Name:</strong> {selectedUser.name || "Name Not Added"}</p>
                                            <p><strong>Email:</strong> {selectedUser.email}</p>

                                        </div>

                                        <div className="border-l pl-2.5">
                                            <p><strong>Role:</strong> {selectedUser.role.name}</p>
                                            {/* <p><strong>Adm No:</strong> {selectedUser.role.name}</p> */}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Issue date */}
                        <div>
                            <Label htmlFor="issue-date">Issue Date</Label>
                            <Input
                                id="issue-date"
                                type="date"
                                value={issueDate}
                                className='mt-2'
                                onChange={(e) => setIssueDate(e.target.value)}
                            />
                        </div>
                        {/* Due date */}
                        <div>
                            <Label htmlFor="due-date">Return Date</Label>
                            <Input
                                id="due-date"
                                type="date"
                                value={dueDate}
                                className='mt-2'
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                        {/* Charges */}
                        <div>
                            <Label htmlFor="charges">Initial Charges/Fines ₹</Label>
                            <Input
                                id="charges"
                                type="number"
                                step="0.01"
                                value={charges} className='mt-2'
                                onChange={(e) => setCharges(parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleIssue} className={'w-full'} disabled={mutation.isPending}>
                            {mutation.isPending ? "Issuing..." : "Issue Book"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
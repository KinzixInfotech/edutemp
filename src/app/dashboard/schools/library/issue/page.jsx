'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAcademicYear } from '@/context/AcademicYearContext';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { useDebounce } from 'use-debounce';
import {
    BookOpen, BookPlus, BookMinus, Search, X, User, History,
    AlertCircle, ChevronRight, Loader2, Clock, CheckCircle2,
    ArrowLeft, RotateCcw, BadgeCheck, Hash, ArrowUpDown, ChevronLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// ── helpers ──────────────────────────────────────────────────────────────────
const initials = (name = '') =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const CONDITION_COLORS = {
    NEW: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
    GOOD: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
    FAIR: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
    POOR: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400',
};

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDot({ n, active, done, label }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all
                ${done ? 'bg-green-500 border-green-500 text-white' : active ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted border-border text-muted-foreground'}`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : n}
            </div>
            <span className={`text-[10px] font-medium ${active || done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
        </div>
    );
}

function StepLine({ done }) {
    return <div className={`flex-1 h-0.5 mt-[-20px] transition-all ${done ? 'bg-green-500' : 'bg-border'}`} />;
}

// ── Book card ─────────────────────────────────────────────────────────────────
function BookCard({ book, onSelect }) {
    return (
        <button onClick={() => onSelect(book)}
            className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent hover:border-primary/30 transition-all text-left group">
            <div className="w-9 h-12 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                <BookOpen className="w-4 h-4 text-primary opacity-60" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{book.title}</p>
                <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{book.category}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${book.availableCopies > 0 ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-100 text-red-600'}`}>
                    {book.availableCopies} free
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
        </button>
    );
}

// ── User row ──────────────────────────────────────────────────────────────────
function UserRow({ user, onSelect, dimmed }) {
    return (
        <button onClick={() => onSelect(user)}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:bg-accent hover:border-border transition-all text-left ${dimmed ? 'opacity-60 hover:opacity-100' : ''}`}>
            <Avatar className="h-9 w-9 border border-border shrink-0">
                <AvatarImage src={user.image} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.identifier} · {user.details}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
    );
}

// ── Selected chip ─────────────────────────────────────────────────────────────
function SelectedChip({ label, sub, onClear, icon }) {
    return (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{label}</p>
                {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
            </div>
            <button onClick={onClear} className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ISSUE TAB
// ═════════════════════════════════════════════════════════════════════════════
function IssueTab({ schoolId, settings, classes }) {
    const [step, setStep] = useState(1); // 1=book, 2=copy, 3=user

    // Book search properties matching catalog view
    const [bookQ, setBookQ] = useState('');
    const [dBookQ] = useDebounce(bookQ, 300);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortColumn, setSortColumn] = useState('title');
    const [sortDirection, setSortDirection] = useState('asc');
    const [selectedBook, setSelectedBook] = useState(null);

    // Copy
    const [copies, setCopies] = useState([]);
    const [loadingCopies, setLoadingCopies] = useState(false);
    const [selectedCopy, setSelectedCopy] = useState(null);
    const [dueDate, setDueDate] = useState('');

    // User search
    const [userType, setUserType] = useState('STUDENT');
    const [userQ, setUserQ] = useState('');
    const [dUserQ] = useDebounce(userQ, 300);
    const [userResults, setUserResults] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [recentUsers, setRecentUsers] = useState([]);
    const [sections, setSections] = useState([]);
    const [classFilter, setClassFilter] = useState('ALL');
    const [sectionFilter, setSectionFilter] = useState('ALL');

    // Submitting
    const [submitting, setSubmitting] = useState(false);

    // Load recent users from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`lib_recent_${schoolId}`);
        if (saved) setRecentUsers(JSON.parse(saved));
    }, [schoolId]);

    const saveRecent = useCallback((user) => {
        const updated = [user, ...recentUsers.filter(u => u.id !== user.id)].slice(0, 5);
        setRecentUsers(updated);
        localStorage.setItem(`lib_recent_${schoolId}`, JSON.stringify(updated));
    }, [recentUsers, schoolId]);

    // Auto-set due date when user type changes
    useEffect(() => {
        if (!settings) return;
        const days = userType === 'STUDENT' ? settings.issueDaysStudent : settings.issueDaysTeacher;
        const d = new Date();
        d.setDate(d.getDate() + days);
        setDueDate(d.toISOString().split('T')[0]);
    }, [userType, settings]);

    // Enhanced book search using React Query for pagination, sort, and default list loading
    const booksQueryKey = ["library-books-issue", schoolId, dBookQ, currentPage, pageSize, sortColumn, sortDirection];
    const { data: booksResponse, isLoading: loadingBooks, isFetching: fetchingBooks } = useQuery({
        queryKey: booksQueryKey,
        queryFn: async () => {
            const params = new URLSearchParams();
            if (dBookQ) params.set("search", dBookQ);
            params.set("page", currentPage);
            params.set("limit", pageSize);
            params.set("sortColumn", sortColumn);
            params.set("sortDirection", sortDirection);
            return (await axios.get(`/api/schools/${schoolId}/library/books?${params}`)).data;
        },
        enabled: !!schoolId && step === 1,
        placeholderData: keepPreviousData,
        staleTime: 10_000,
    });

    const books = booksResponse?.data || [];
    const totalPages = booksResponse?.totalPages || 1;
    const totalBooks = booksResponse?.total || 0;

    const handleSort = (column) => {
        if (sortColumn === column) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        else { setSortColumn(column); setSortDirection('asc'); }
    };

    const SortableHeader = ({ column, children }) => (
        <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort(column)}>
            <div className="flex items-center gap-1">
                {children}
                <ArrowUpDown className={`w-4 h-4 ${sortColumn === column ? "text-primary" : "text-muted-foreground/50"}`} />
            </div>
        </TableHead>
    );

    const getAvailabilityBadge = (available, total) => {
        if (available === 0) return <Badge variant="destructive">Not Available</Badge>;
        if (available < total / 2) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">{available} / {total}</Badge>;
        return <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">{available} / {total}</Badge>;
    };

    // Fetch copies when book selected
    const pickBook = async (book) => {
        if (book.availableCopies === 0) {
            toast.error('No copies available for issue');
            return;
        }
        setSelectedBook(book);
        setBookQ('');
        setStep(2);
        setLoadingCopies(true);
        try {
            const r = await axios.get(`/api/schools/${schoolId}/library/books/${book.id}/copies`);
            setCopies(Array.isArray(r.data) ? r.data : []);
        } catch { toast.error('Failed to fetch copies'); }
        finally { setLoadingCopies(false); }
    };

    // User search
    useEffect(() => {
        const hasFilter = classFilter !== 'ALL' || sectionFilter !== 'ALL';
        if (!dUserQ && userType === 'STUDENT' && !hasFilter) { setUserResults([]); return; }
        setLoadingUsers(true);
        let url = `/api/schools/${schoolId}/library/users/search?type=${userType}`;
        if (dUserQ) url += `&query=${encodeURIComponent(dUserQ)}`;
        if (userType === 'STUDENT') {
            if (classFilter !== 'ALL') url += `&classId=${classFilter}`;
            if (sectionFilter !== 'ALL') url += `&sectionId=${sectionFilter}`;
        }
        axios.get(url)
            .then(r => setUserResults(Array.isArray(r.data) ? r.data : []))
            .catch(() => { })
            .finally(() => setLoadingUsers(false));
    }, [dUserQ, schoolId, userType, classFilter, sectionFilter]);

    const fetchSections = async (classId) => {
        if (classId === 'ALL') { setSections([]); return; }
        try {
            const r = await axios.get(`/api/schools/${schoolId}/classes/${classId}/sections`);
            setSections(r.data || []);
        } catch { }
    };

    const handleIssue = async () => {
        if (!selectedUser || !selectedCopy || !dueDate) { toast.error('Fill all fields'); return; }
        setSubmitting(true);
        try {
            await axios.post(`/api/schools/${schoolId}/library/transactions/issue`, {
                copyId: selectedCopy.id,
                userId: selectedUser.id,
                userType,
                dueDate,
                schoolId,
            });
            toast.success(`"${selectedBook.title}" issued to ${selectedUser.name}`);
            // Reset
            setStep(1); setSelectedBook(null); setSelectedCopy(null); setSelectedUser(null);
            setCopies([]); setUserQ(''); setUserResults([]);
            setClassFilter('ALL'); setSectionFilter('ALL');
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to issue book');
        } finally { setSubmitting(false); }
    };

    const availableCopies = copies.filter(c => c.status === 'AVAILABLE');

    return (
        <div className="space-y-6">
            {/* Step indicator */}
            <div className="flex items-center px-2">
                <StepDot n={1} active={step === 1} done={step > 1} label="Book" />
                <StepLine done={step > 1} />
                <StepDot n={2} active={step === 2} done={step > 2} label="Copy" />
                <StepLine done={step > 2} />
                <StepDot n={3} active={step === 3} done={false} label="User" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* ── Step 1: Book ── */}
                <div className={`space-y-3 ${step < 1 ? 'opacity-50 pointer-events-none' : ''} ${step === 1 ? 'lg:col-span-3' : 'lg:col-span-1'}`}>
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">1</span>
                            {step === 1 ? 'Search Books Catalog' : 'Selected Book'}
                        </Label>
                        {selectedBook && <button onClick={() => { setSelectedBook(null); setSelectedCopy(null); setSelectedUser(null); setCopies([]); setStep(1); }} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Change</button>}
                    </div>

                    {selectedBook ? (
                        <SelectedChip
                            label={selectedBook.title}
                            sub={`by ${selectedBook.author} · ${selectedBook.availableCopies} available`}
                            icon={<BookOpen className="w-4 h-4" />}
                            onClear={() => { setSelectedBook(null); setSelectedCopy(null); setSelectedUser(null); setCopies([]); setStep(1); }}
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="relative w-full sm:max-w-md">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search books by title, author, or ISBN..." className="pl-9 h-10"
                                        value={bookQ} onChange={e => { setBookQ(e.target.value); setCurrentPage(1); }} autoFocus />
                                    {bookQ && <button onClick={() => setBookQ('')} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Rows:</span>
                                    <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                                        <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5</SelectItem>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="25">25</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
    
                            <div className="rounded-xl border bg-card overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="dark:bg-background/50 bg-muted/50">
                                            <SortableHeader column="title">Title</SortableHeader>
                                            <SortableHeader column="author">Author</SortableHeader>
                                            <TableHead>ISBN</TableHead>
                                            <SortableHeader column="category">Category</SortableHeader>
                                            <SortableHeader column="available">Availability</SortableHeader>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingBooks || fetchingBooks ? (
                                             Array.from({ length: 5 }).map((_, i) => (
                                                <TableRow key={i}>
                                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : books.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                                                        <p className="text-muted-foreground">No books found matching search.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : books.map((book) => (
                                            <TableRow key={book.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium">{book.title}</TableCell>
                                                <TableCell className="text-muted-foreground">{book.author}</TableCell>
                                                <TableCell className="text-muted-foreground font-mono text-xs">{book.ISBN}</TableCell>
                                                <TableCell><Badge variant="outline" className="text-xs">{book.category}</Badge></TableCell>
                                                <TableCell>{getAvailabilityBadge(book.availableCopies, book.totalCopies)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" onClick={() => pickBook(book)} disabled={book.availableCopies === 0}
                                                        variant={book.availableCopies > 0 ? "default" : "secondary"}>
                                                        Select
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalBooks)} of {totalBooks.toLocaleString()}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
                                        <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
                                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Step 2: Copy ── */}
                <div className={`space-y-3 ${step < 2 ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">2</span>
                            Select Copy
                        </Label>
                        {selectedCopy && <button onClick={() => { setSelectedCopy(null); setStep(2); }} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Change</button>}
                    </div>

                    {selectedCopy ? (
                        <SelectedChip
                            label={`Acc: ${selectedCopy.accessionNumber}`}
                            sub={`Condition: ${selectedCopy.condition}`}
                            icon={<Hash className="w-4 h-4" />}
                            onClear={() => { setSelectedCopy(null); setStep(2); }}
                        />
                    ) : (
                        <div className="border rounded-xl bg-muted/20 overflow-hidden" style={{ minHeight: 160 }}>
                            <ScrollArea className="h-[200px]">
                                <div className="p-2 space-y-1.5">
                                    {loadingCopies ? (
                                        <div className="flex items-center justify-center h-32 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
                                    ) : !selectedBook ? (
                                        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs gap-2">
                                            <BookOpen className="w-8 h-8 opacity-20" />
                                            <p>Select a book first</p>
                                        </div>
                                    ) : availableCopies.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs gap-2">
                                            <AlertCircle className="w-8 h-8 opacity-30" />
                                            <p>No available copies</p>
                                        </div>
                                    ) : availableCopies.map(c => (
                                        <button key={c.id} onClick={() => { setSelectedCopy(c); setStep(3); }}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent hover:border-primary/30 transition-all text-left group">
                                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground border">
                                                #{c.accessionNumber?.slice(-3)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm">{c.accessionNumber}</p>
                                                {c.location && <p className="text-xs text-muted-foreground">{c.location}</p>}
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CONDITION_COLORS[c.condition] || CONDITION_COLORS.GOOD}`}>{c.condition}</span>
                                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    {selectedCopy && (
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Due Date</Label>
                            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-9" />
                        </div>
                    )}
                </div>

                {/* ── Step 3: User ── */}
                <div className={`space-y-3 ${step < 3 ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold">3</span>
                            Select User
                        </Label>
                        {selectedUser && <button onClick={() => { setSelectedUser(null); }} className="text-xs text-muted-foreground hover:text-destructive transition-colors">Change</button>}
                    </div>

                    {selectedUser ? (
                        <SelectedChip
                            label={selectedUser.name}
                            sub={`${selectedUser.identifier} · ${selectedUser.type}`}
                            icon={<User className="w-4 h-4" />}
                            onClear={() => setSelectedUser(null)}
                        />
                    ) : (
                        <>
                            <Select value={userType} onValueChange={v => { setUserType(v); setSelectedUser(null); setUserQ(''); setUserResults([]); setClassFilter('ALL'); setSectionFilter('ALL'); }}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="STUDENT">Student</SelectItem>
                                    <SelectItem value="TEACHER">Teacher</SelectItem>
                                    <SelectItem value="STAFF">Staff</SelectItem>
                                </SelectContent>
                            </Select>

                            {userType === 'STUDENT' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <Select value={classFilter} onValueChange={v => { setClassFilter(v); fetchSections(v); setSectionFilter('ALL'); }}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Class" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Classes</SelectItem>
                                            {classes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.className}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={classFilter === 'ALL'}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Sections</SelectItem>
                                            {sections.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input placeholder={userType === 'STUDENT' ? 'Name or roll no…' : 'Name or employee ID…'} className="pl-9 h-9"
                                    value={userQ} onChange={e => setUserQ(e.target.value)} />
                                {userQ && <button onClick={() => setUserQ('')} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
                            </div>

                            <div className="border rounded-xl bg-muted/20 overflow-hidden" style={{ minHeight: 130 }}>
                                <ScrollArea className="h-[160px]">
                                    <div className="p-2 space-y-1">
                                        {loadingUsers ? (
                                            <div className="flex items-center justify-center h-24 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
                                        ) : userResults.length > 0 ? userResults.map(u => (
                                            <UserRow key={u.id} user={u} onSelect={u => { setSelectedUser(u); saveRecent(u); setUserQ(''); setUserResults([]); }} />
                                        )) : userQ.length >= 2 ? (
                                            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground text-xs gap-1.5">
                                                <User className="w-7 h-7 opacity-20" />
                                                <p>No users found</p>
                                            </div>
                                        ) : recentUsers.length > 0 && userType === 'STUDENT' ? (
                                            <div>
                                                <p className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                                                    <History className="w-3 h-3" /> Recent
                                                </p>
                                                {recentUsers.map(u => <UserRow key={u.id} user={u} dimmed onSelect={u => { setSelectedUser(u); }} />)}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground text-xs gap-1.5">
                                                <Search className="w-7 h-7 opacity-20" />
                                                <p>Search by name{userType === 'STUDENT' ? ' or filter by class' : ''}</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Issue button */}
            <div className="pt-2 border-t">
                <Button onClick={handleIssue}
                    disabled={!selectedBook || !selectedCopy || !selectedUser || submitting}
                    className="w-full h-11">
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookPlus className="w-4 h-4 mr-2" />}
                    {submitting ? 'Issuing…' : selectedBook && selectedUser ? `Issue "${selectedBook.title}" to ${selectedUser.name}` : 'Issue Book'}
                </Button>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// RETURN TAB — search active transactions by student/book, not raw ID
// ═════════════════════════════════════════════════════════════════════════════
function ReturnTab({ schoolId, settings }) {
    const queryClient = useQueryClient();
    const [searchQ, setSearchQ] = useState('');
    const [dSearchQ] = useDebounce(searchQ, 400);
    const [selectedTxn, setSelectedTxn] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [returning, setReturning] = useState(false);
    const [fine, setFine] = useState(null);

    // Search active transactions via react-query
    const { data: txnsResponse, isLoading: loadingTxns, isFetching: fetchingTxns } = useQuery({
        queryKey: ["library-active-transactions", schoolId, dSearchQ],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (dSearchQ) params.set("search", dSearchQ);
            params.set("page", 1);
            params.set("limit", 100); // Fetch up to 100 active transactions for simple UI
            return (await axios.get(`/api/schools/${schoolId}/library/transactions/active?${params}`)).data;
        },
        enabled: !!schoolId && !selectedTxn,
        placeholderData: keepPreviousData,
        staleTime: 5000,
    });
    const transactions = Array.isArray(txnsResponse) ? txnsResponse : (txnsResponse?.transactions || []);

    // Preview fine
    useEffect(() => {
        if (!selectedTxn) { setFine(null); return; }
        const now = new Date();
        const due = new Date(selectedTxn.dueDate);
        if (now > due) {
            const days = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
            setFine(days * (settings?.finePerDay || 5));
        } else { setFine(0); }
    }, [selectedTxn, settings]);

    const handleReturn = async () => {
        if (!selectedTxn) return;
        setReturning(true);
        try {
            const r = await axios.post(`/api/schools/${schoolId}/library/transactions/return`, {
                transactionId: selectedTxn.id, remarks,
            });
            const f = r.data.fineAmount || 0;
            if (f > 0) toast.warning(`Returned! Fine due: ₹${f}`);
            else toast.success('Book returned successfully');
            setSelectedTxn(null); setRemarks(''); setFine(null);
            queryClient.invalidateQueries({ queryKey: ["library-active-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["library-books-issue"] });
        } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to return');
        } finally { setReturning(false); }
    };

    const isOverdue = selectedTxn && new Date() > new Date(selectedTxn.dueDate);

    return (
        <div className="space-y-5">
            {!selectedTxn ? (
                <>
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search by student name, book title, or accession number…"
                            className="pl-9 h-10" value={searchQ} onChange={e => setSearchQ(e.target.value)} autoFocus />
                        {searchQ && <button onClick={() => setSearchQ('')} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
                    </div>

                    <div className="rounded-xl border bg-card overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="dark:bg-background/50 bg-muted/50">
                                    <TableHead>Book Title</TableHead>
                                    <TableHead>Accession No.</TableHead>
                                    <TableHead>Issued To</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingTxns || fetchingTxns ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : transactions.length > 0 ? transactions.map(t => {
                                    const overdue = new Date() > new Date(t.dueDate);
                                    const daysLeft = Math.ceil((new Date(t.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                                    return (
                                        <TableRow key={t.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium">{t.copy?.book?.title || 'Unknown Book'}</TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">{t.copy?.accessionNumber}</TableCell>
                                            <TableCell>{t.userName || t.userId}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-semibold ${overdue ? 'text-red-500' : 'text-green-600'}`}>
                                                        {overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">{new Date(t.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={overdue ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}>
                                                    {overdue ? 'Overdue' : 'Active'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="default" onClick={() => setSelectedTxn(t)}>
                                                    Return
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2">
                                                <RotateCcw className="w-10 h-10 text-muted-foreground/30" />
                                                <p className="text-muted-foreground">{searchQ.length >= 2 ? 'No active transactions found' : 'No active issues'}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </>
            ) : (
                /* Selected transaction — confirm return */
                <div className="space-y-4">
                    <button onClick={() => setSelectedTxn(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to search
                    </button>

                    {/* Book + User info */}
                    <div className={`rounded-2xl border p-4 space-y-3 ${isOverdue ? 'border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/10' : 'border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/10'}`}>
                        <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? 'bg-red-100 dark:bg-red-950/30' : 'bg-green-100 dark:bg-green-950/30'}`}>
                                <BookOpen className={`w-5 h-5 ${isOverdue ? 'text-red-600' : 'text-green-600'}`} />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold">{selectedTxn.copy?.book?.title || 'Book'}</p>
                                <p className="text-sm text-muted-foreground">Acc: {selectedTxn.copy?.accessionNumber}</p>
                            </div>
                            <Badge className={isOverdue ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}>
                                {isOverdue ? 'Overdue' : 'On Time'}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><p className="text-muted-foreground text-xs">Issued To</p><p className="font-semibold">{selectedTxn.userName || 'Student'}</p></div>
                            <div><p className="text-muted-foreground text-xs">Issue Date</p><p className="font-semibold">{new Date(selectedTxn.issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                            <div><p className="text-muted-foreground text-xs">Due Date</p><p className={`font-semibold ${isOverdue ? 'text-red-600' : ''}`}>{new Date(selectedTxn.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                            <div><p className="text-muted-foreground text-xs">Fine</p>
                                <p className={`font-bold text-base ${fine > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {fine === null ? '…' : fine > 0 ? `₹${fine}` : '₹0'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm text-muted-foreground">Remarks <span className="text-muted-foreground/60">(optional)</span></Label>
                        <Input placeholder="Condition on return, notes…" value={remarks} onChange={e => setRemarks(e.target.value)} />
                    </div>

                    {fine > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-xl text-sm">
                            <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
                            <p className="text-orange-700 dark:text-orange-400">Collect fine of <strong>₹{fine}</strong> before returning.</p>
                        </div>
                    )}

                    <Button onClick={handleReturn} disabled={returning} className={`w-full h-11 ${isOverdue ? 'bg-red-600 hover:bg-red-700' : ''}`}>
                        {returning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookMinus className="w-4 h-4 mr-2" />}
                        {returning ? 'Processing…' : `Confirm Return${fine > 0 ? ` · Collect ₹${fine}` : ''}`}
                    </Button>
                </div>
            )}
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function LibraryIssueReturn() {
    const { fullUser } = useAuth();
    const { selectedYear } = useAcademicYear();
    const academicYearId = selectedYear?.id;
    const schoolId = fullUser?.schoolId;
    const [settings, setSettings] = useState(null);
    const [classes, setClasses] = useState([]);

    useEffect(() => {
        if (!schoolId) return;
        axios.get(`/api/schools/${schoolId}/library/settings`).then(r => setSettings(r.data)).catch(() => { });
        const classParams = new URLSearchParams();
        if (academicYearId) classParams.append('academicYearId', academicYearId);
        axios.get(`/api/schools/${schoolId}/classes?${classParams}`).then(r => setClasses(r.data || [])).catch(() => { });
    }, [schoolId, academicYearId]);

    if (!schoolId) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Issue & Return</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage book circulation with automatic fine calculation</p>
                </div>
                {settings && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/40 border rounded-xl px-3 py-2">
                        <span>Student: <strong className="text-foreground">{settings.maxBooksStudent} books · {settings.issueDaysStudent}d</strong></span>
                        <span className="opacity-40">·</span>
                        <span>Staff: <strong className="text-foreground">{settings.maxBooksTeacher} books · {settings.issueDaysTeacher}d</strong></span>
                        <span className="opacity-40">·</span>
                        <span>Fine: <strong className="text-foreground">₹{settings.finePerDay}/day</strong></span>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="issue">
                <TabsList className="h-10">
                    <TabsTrigger value="issue" className="gap-2 px-5">
                        <BookPlus className="w-4 h-4" /> Issue Book
                    </TabsTrigger>
                    <TabsTrigger value="return" className="gap-2 px-5">
                        <BookMinus className="w-4 h-4" /> Return Book
                    </TabsTrigger>
                </TabsList>

                <div className="mt-4 border rounded-2xl p-5 bg-card">
                    <TabsContent value="issue" className="mt-0">
                        <IssueTab schoolId={schoolId} settings={settings} classes={classes} />
                    </TabsContent>
                    <TabsContent value="return" className="mt-0">
                        <ReturnTab schoolId={schoolId} settings={settings} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
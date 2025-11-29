"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus, RefreshCw, Loader2, Search, LayoutGrid, List as ListIcon, Mail, Phone, MapPin, User, Building2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function StaffList({
    title,
    data = [],
    loading = false,
    onRefresh,
    addNewLink,
    filterOptions = [],
    type = "TEACHING", // 'TEACHING' or 'NON_TEACHING'
}) {
    const [search, setSearch] = useState("");
    const [filterValue, setFilterValue] = useState("ALL");
    const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
    const [page, setPage] = useState(1);
    const [dialogData, setDialogData] = useState(null);
    const itemsPerPage = viewMode === 'grid' ? 8 : 10;

    // Filter Logic
    const filteredData = data.filter((item) => {
        const matchesFilter =
            filterValue === "ALL" ||
            (type === "TEACHING"
                ? item.subjects?.some((sub) => sub.name === filterValue)
                : item.designation === filterValue);

        const matchesSearch =
            !search ||
            item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.email.toLowerCase().includes(search.toLowerCase()) ||
            item.employeeId?.toLowerCase().includes(search.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    // Pagination Logic
    const pageCount = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (page - 1) * itemsPerPage,
        page * itemsPerPage
    );

    // Reset page on filter change
    React.useEffect(() => {
        setPage(1);
    }, [search, filterValue, viewMode]);

    // Calculate unique stats from actual data
    const uniqueCategories = React.useMemo(() => {
        if (type === 'TEACHING') {
            const subjects = new Set();
            data.forEach(item => {
                item.subjects?.forEach(sub => subjects.add(sub.name));
            });
            return subjects.size;
        } else {
            const designations = new Set();
            data.forEach(item => {
                if (item.designation) designations.add(item.designation);
            });
            return designations.size;
        }
    }, [data, type]);

    const StatsCard = ({ label, value, icon: Icon, color }) => (
        <Card>
            <CardContent className="p-6 flex items-center justify-between space-y-0">
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground">{label}</span>
                    <span className="text-2xl font-bold">{value}</span>
                </div>
                <div className={cn("p-3 rounded-full", color)}>
                    <Icon className="w-5 h-5" />
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
                    <p className="text-muted-foreground mt-1">
                        Manage your {type === 'TEACHING' ? 'teaching' : 'non-teaching'} staff members
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                    <Link href={addNewLink}>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add New
                        </Button>
                    </Link>
                </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                    label="Total Staff"
                    value={data.length}
                    icon={User}
                    color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                />
                <StatsCard
                    label="Active Staff"
                    value={data.filter(d => d.user?.status === 'ACTIVE').length}
                    icon={User}
                    color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                />
                <StatsCard
                    label={type === 'TEACHING' ? 'Active Departments' : 'Active Designations'}
                    value={uniqueCategories}
                    icon={Building2}
                    color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                />
            </div>
            <Separator />
            {/* Filters & Controls */}
            <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-muted/40 p-4 rounded-lg border">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-[300px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, email, or ID..."
                            className="pl-9 bg-background"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select value={filterValue} onValueChange={setFilterValue}>
                        <SelectTrigger className="w-full md:w-[200px] bg-background">
                            <SelectValue placeholder={`Filter by ${type === 'TEACHING' ? 'Subject' : 'Designation'}`} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All {type === 'TEACHING' ? 'Subjects' : 'Designations'}</SelectItem>
                            {filterOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                    {opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex items-center border rounded-md bg-background">
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-9 w-9 rounded-none rounded-l-md"
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-9" />
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-9 w-9 rounded-none rounded-r-md"
                            onClick={() => setViewMode('list')}
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Loading staff members...</p>
                </div>
            ) : filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border rounded-lg border-dashed">
                    <User className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No staff members found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {paginatedData.map((item) => (
                                <Card key={item.id || item.userId} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDialogData(item)}>
                                    <div className="h-24 bg-gradient-to-r from-primary/10 to-primary/5" />
                                    <CardContent className="pt-0 -mt-12 text-center pb-6">
                                        <Avatar className="w-24 h-24 mx-auto border-4 border-background shadow-sm">
                                            <AvatarImage src={item.user?.profilePicture} />
                                            <AvatarFallback className="text-xl">{item.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="mt-4 space-y-1">
                                            <h3 className="font-semibold text-lg truncate px-2" title={item.name}>{item.name}</h3>
                                            <p className="text-sm text-muted-foreground truncate px-2">{item.email}</p>
                                            <Badge variant="secondary" className="mt-2">
                                                {type === 'TEACHING'
                                                    ? (item.subjects?.[0]?.name || 'No Subject')
                                                    : (item.designation || 'Staff')}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[80px]">Photo</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>{type === 'TEACHING' ? 'Subjects' : 'Designation'}</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedData.map((item) => (
                                        <TableRow key={item.id || item.userId}>
                                            <TableCell>
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={item.user?.profilePicture} />
                                                    <AvatarFallback>{item.name?.[0]}</AvatarFallback>
                                                </Avatar>
                                            </TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>{item.email}</TableCell>
                                            <TableCell>
                                                {type === 'TEACHING' ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {item.subjects?.slice(0, 2).map((sub, i) => (
                                                            <Badge key={i} variant="outline" className="text-xs">
                                                                {sub.name}
                                                            </Badge>
                                                        ))}
                                                        {item.subjects?.length > 2 && (
                                                            <Badge variant="outline" className="text-xs">+{item.subjects.length - 2}</Badge>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Badge variant="outline">{item.designation}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={item.user?.status === 'ACTIVE' ? 'default' : 'destructive'}
                                                    className={cn("text-xs", item.user?.status === 'ACTIVE' && "bg-green-500 hover:bg-green-600")}
                                                >
                                                    {item.user?.status || 'Active'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => setDialogData(item)}>
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {/* Pagination */}
                    {pageCount > 1 && (
                        <div className="flex justify-center mt-6">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                            className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <span className="text-sm px-4">
                                            Page {page} of {pageCount}
                                        </span>
                                    </PaginationItem>
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
                                            className={page === pageCount ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </>
            )}
            {/* Profile Dialog */}
            {dialogData && (
                <Dialog open={!!dialogData} onOpenChange={() => setDialogData(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Staff Profile</DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                            {/* Sidebar Info */}
                            <div className="flex flex-col items-center text-center space-y-4 p-4 bg-muted/30 rounded-lg border">
                                <Avatar className="w-32 h-32 border-4 border-background shadow-md">
                                    <AvatarImage src={dialogData.user?.profilePicture} />
                                    <AvatarFallback className="text-3xl">{dialogData.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h3 className="font-bold text-xl">{dialogData.name}</h3>
                                    <p className="text-sm text-muted-foreground">{dialogData.email}</p>
                                    <Badge className="mt-2" variant="secondary">{dialogData.employeeId}</Badge>
                                </div>
                                <div className="w-full pt-4 border-t">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="text-muted-foreground">Status</div>
                                        <div className="font-medium text-green-600">{dialogData.user?.status || 'Active'}</div>
                                        <div className="text-muted-foreground">Gender</div>
                                        <div className="font-medium">{dialogData.gender || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Info */}
                            <div className="md:col-span-2 space-y-6">
                                <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-primary" />
                                        Professional Details
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted/30 rounded-lg border">
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Designation</span>
                                            <span className="font-medium">{dialogData.designation || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Department</span>
                                            <span className="font-medium">
                                                {type === 'TEACHING'
                                                    ? dialogData.subjects?.map(s => s.name).join(', ') || 'N/A'
                                                    : 'Non-Teaching'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Joining Date</span>
                                            <span className="font-medium">N/A</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Experience</span>
                                            <span className="font-medium">N/A</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <User className="h-4 w-4 text-primary" />
                                        Personal Information
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted/30 rounded-lg border">
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Phone</span>
                                            <span className="font-medium">{dialogData.contactNumber || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Date of Birth</span>
                                            <span className="font-medium">{dialogData.dob ? new Date(dialogData.dob).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Blood Group</span>
                                            <span className="font-medium">{dialogData.bloodGroup || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-xs">Age</span>
                                            <span className="font-medium">{dialogData.age || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        Address
                                    </h4>
                                    <div className="text-sm p-4 bg-muted/30 rounded-lg border">
                                        <p>{dialogData.address || 'No address provided'}</p>
                                        <p className="mt-1 text-muted-foreground">
                                            {[dialogData.City, dialogData.district, dialogData.state, dialogData.PostalCode].filter(Boolean).join(', ')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { GoogleMap, useLoadScript, Marker, InfoWindow, MarkerClusterer, OverlayView } from "@react-google-maps/api";
import { Bus, MapPin, Clock, Phone, User, RefreshCw, Activity, Search, RotateCcw, ArrowUpDown, ChevronLeft, ChevronRight, Eye, MoreHorizontal, Users, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const mapContainerStyle = {
    width: "100%",
    height: "400px",
    borderRadius: "12px",
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 };
const libraries = ["places"];

// Unique colors for bus markers (based on index/hash)
const BUS_COLORS = [
    "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444",
    "#06B6D4", "#EC4899", "#84CC16", "#14B8A6", "#F97316",
    "#6366F1", "#22C55E", "#A855F7", "#FBBF24", "#DC2626",
];

// Get unique color for a bus based on its ID
const getBusColor = (busId, status) => {
    if (status === "OFFLINE") return "#EF4444"; // Always red for offline
    // Hash the ID to get a consistent color
    const hash = busId.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
    const idx = Math.abs(hash) % BUS_COLORS.length;
    return BUS_COLORS[idx];
};

// Custom cluster styles - using a simple blue circle
const clusterStyles = [
    {
        url: "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='18' fill='%233B82F6' stroke='white' stroke-width='4'/%3E%3C/svg%3E",
        width: 40,
        height: 40,
        textColor: '#ffffff',
        textSize: 14,
    }
];

export default function LiveTrackingPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const mapRef = useRef(null);

    // State
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedBus, setSelectedBus] = useState(null);

    // Table state
    const [sortColumn, setSortColumn] = useState("licensePlate");
    const [sortDirection, setSortDirection] = useState("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    // Fetch all bus locations with polling
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["all-bus-locations", schoolId, search, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({ schoolId });
            if (search) params.set("search", search);
            if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
            const res = await fetch(`/api/schools/transport/location/all?${params}`);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
        enabled: !!schoolId,
        refetchInterval: 10000,
        staleTime: 10000,
    });

    const buses = data?.buses || [];
    const stats = data?.stats || { total: 0, active: 0, online: 0, offline: 0 };

    // Calculate map center
    const mapCenter = useMemo(() => {
        const firstWithLoc = buses.find(b => b.location);
        if (firstWithLoc?.location) {
            return { lat: firstWithLoc.location.latitude, lng: firstWithLoc.location.longitude };
        }
        return defaultCenter;
    }, [buses]);

    // Sort and paginate
    const processedBuses = useMemo(() => {
        let sorted = [...buses];
        sorted.sort((a, b) => {
            let aVal, bVal;
            switch (sortColumn) {
                case "licensePlate": aVal = a.licensePlate || ""; bVal = b.licensePlate || ""; break;
                case "status": aVal = a.status || ""; bVal = b.status || ""; break;
                case "route": aVal = a.routeName || ""; bVal = b.routeName || ""; break;
                case "driver": aVal = a.driver?.name || ""; bVal = b.driver?.name || ""; break;
                case "students": aVal = a.assignedStudents || 0; bVal = b.assignedStudents || 0; break;
                default: aVal = a.licensePlate || ""; bVal = b.licensePlate || "";
            }
            if (typeof aVal === "string") {
                return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        });
        return sorted;
    }, [buses, sortColumn, sortDirection]);

    const totalPages = Math.ceil(processedBuses.length / pageSize);
    const paginatedBuses = processedBuses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const clearFilters = () => {
        setSearch("");
        setStatusFilter("all");
        setCurrentPage(1);
    };

    const formatTimeAgo = (seconds, status) => {
        if (!seconds && seconds !== 0) {
            return status === "OFFLINE" ? "No data yet" : "N/A";
        }
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "MOVING": return <Badge className="bg-green-100 text-green-700 border-green-200">Moving</Badge>;
            case "IDLE": return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Idle</Badge>;
            default: return <Badge variant="destructive">Offline</Badge>;
        }
    };

    const SortableHeader = ({ column, children }) => (
        <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort(column)}>
            <div className="flex items-center gap-1">
                {children}
                <ArrowUpDown className={`w-4 h-4 ${sortColumn === column ? "text-primary" : "text-muted-foreground/50"}`} />
            </div>
        </TableHead>
    );

    const TableLoadingRows = () => (
        <>
            {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
            ))}
        </>
    );

    const onMapLoad = useCallback((map) => { mapRef.current = map; }, []);

    if (!schoolId) {
        return <div className="flex items-center justify-center h-96"><p className="text-muted-foreground">Select a school to view live tracking</p></div>;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Bus className="w-8 h-8 text-blue-600" />
                        Live Bus Tracking
                    </h1>
                    <p className="text-muted-foreground mt-2">Real-time location and status of all school buses</p>
                </div>
                <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Buses</CardTitle>
                        <Bus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Trips</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Online</CardTitle>
                        <MapPin className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.online}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Offline</CardTitle>
                        <Clock className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.offline}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Status Legend */}
            <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-muted/50 rounded-lg text-sm">
                <span className="font-medium text-muted-foreground">Status Guide:</span>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span>Moving <span className="text-muted-foreground text-xs">(updating every 10s)</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span>Idle <span className="text-muted-foreground text-xs">(stationary)</span></span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>Offline <span className="text-muted-foreground text-xs">(no update for 10+ min)</span></span>
                </div>
            </div>

            {/* Map */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Live Map
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadError ? (
                        <div className="h-[400px] bg-muted rounded-xl flex items-center justify-center">
                            <p className="text-red-500">Error loading Google Maps</p>
                        </div>
                    ) : !isLoaded ? (
                        <div className="h-[400px] bg-muted rounded-xl flex items-center justify-center">
                            <p className="text-muted-foreground">Loading map...</p>
                        </div>
                    ) : (
                        <div className="relative">
                            <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={12} onLoad={onMapLoad} options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}>
                                {/* Bus Markers with Number Plate Labels */}
                                {buses.map((bus) => {
                                    if (!bus.location) return null;
                                    const busColor = getBusColor(bus.id, bus.status);
                                    const encodedColor = encodeURIComponent(busColor);

                                    return (
                                        <div key={bus.id}>
                                            {/* Number Plate Label */}
                                            <OverlayView
                                                position={{ lat: bus.location.latitude, lng: bus.location.longitude }}
                                                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                                getPixelPositionOffset={() => ({ x: 0, y: 0 })}
                                            >
                                                <div
                                                    className="cursor-pointer"
                                                    style={{
                                                        transform: 'translate(-50%, -70px)',
                                                        display: 'inline-block',
                                                        overflow: 'visible'
                                                    }}
                                                    onClick={() => setSelectedBus(bus)}
                                                >
                                                    {/* Number Plate Badge */}
                                                    <div
                                                        style={{
                                                            backgroundColor: busColor,
                                                            padding: '6px 16px',
                                                            borderRadius: '8px',
                                                            color: 'white',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                                            border: '2px solid white',
                                                            whiteSpace: 'nowrap',
                                                            display: 'inline-block'
                                                        }}
                                                    >
                                                        {bus.licensePlate}
                                                    </div>
                                                    {/* Arrow pointing down */}
                                                    <div
                                                        style={{
                                                            width: 0,
                                                            height: 0,
                                                            margin: '0 auto',
                                                            borderLeft: '8px solid transparent',
                                                            borderRight: '8px solid transparent',
                                                            borderTop: `8px solid ${busColor}`,
                                                        }}
                                                    />
                                                </div>
                                            </OverlayView>

                                            {/* Bus Marker - Better bus icon */}
                                            <Marker
                                                position={{ lat: bus.location.latitude, lng: bus.location.longitude }}
                                                onClick={() => setSelectedBus(bus)}
                                                icon={{
                                                    url: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="${busColor}" stroke="white" stroke-width="3"/><path d="M14 18h20c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H14c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2z" fill="white"/><circle cx="17" cy="32" r="2" fill="white"/><circle cx="31" cy="32" r="2" fill="white"/><rect x="15" y="20" width="4" height="4" rx="0.5" fill="${busColor}"/><rect x="21" y="20" width="4" height="4" rx="0.5" fill="${busColor}"/><rect x="27" y="20" width="4" height="4" rx="0.5" fill="${busColor}"/></svg>`)}`,
                                                    scaledSize: new window.google.maps.Size(44, 44),
                                                    anchor: new window.google.maps.Point(22, 22),
                                                }}
                                            />
                                        </div>
                                    );
                                })}

                                {/* Custom Popup - Dark Mode Compatible */}
                                {selectedBus && selectedBus.location && (
                                    <OverlayView
                                        position={{ lat: selectedBus.location.latitude, lng: selectedBus.location.longitude }}
                                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                    >
                                        <div
                                            className="relative"
                                            style={{ transform: 'translate(-50%, -180px)' }}
                                        >
                                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 min-w-[220px] border border-gray-200 dark:border-gray-700">
                                                {/* Close button */}
                                                <button
                                                    onClick={() => setSelectedBus(null)}
                                                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                >
                                                    ✕
                                                </button>

                                                {/* Header */}
                                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                                                    <Bus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                    <span className="font-bold text-gray-900 dark:text-white">{selectedBus.licensePlate}</span>
                                                </div>

                                                {/* Status */}
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                                                    <span className={cn(
                                                        "px-2 py-1 rounded-full text-xs font-bold",
                                                        selectedBus.status === "MOVING" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                            selectedBus.status === "IDLE" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                                                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                    )}>{selectedBus.status}</span>
                                                </div>

                                                {/* Info */}
                                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                                    <p className="flex justify-between">
                                                        <span className="text-gray-400">Updated:</span>
                                                        <span>{formatTimeAgo(selectedBus.secondsAgo, selectedBus.status)}</span>
                                                    </p>
                                                    {selectedBus.driver && (
                                                        <p className="flex justify-between">
                                                            <span className="text-gray-400">Driver:</span>
                                                            <span>{selectedBus.driver.name}</span>
                                                        </p>
                                                    )}
                                                    {selectedBus.routeName && (
                                                        <p className="flex justify-between">
                                                            <span className="text-gray-400">Route:</span>
                                                            <span>{selectedBus.routeName}</span>
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Button */}
                                                <Link href={`/dashboard/transport/live-tracking/${selectedBus.id}`}>
                                                    <Button size="sm" className="mt-3 w-full">View Details</Button>
                                                </Link>
                                            </div>

                                            {/* Arrow pointing down - Two layers for dark mode */}
                                            <div className="flex justify-center -mt-[1px]">
                                                <div className="border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800" />
                                            </div>
                                        </div>
                                    </OverlayView>
                                )}
                            </GoogleMap>

                            {/* Overlay when no buses have location */}
                            {!buses.some(b => b.location) && (
                                <div className="absolute inset-0 bg-gray-900/60 rounded-xl flex flex-col items-center justify-center pointer-events-none">
                                    <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg px-6 py-4 text-center shadow-lg">
                                        <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2 animate-pulse" />
                                        <p className="font-semibold text-lg">Waiting for live location...</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            No buses are sending location data yet.
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Tracking device may be inactive or trip not started.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Filters */}
            <Card className="border-0 shadow-none border">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by license plate or model..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="MOVING">Moving</SelectItem>
                                <SelectItem value="IDLE">Idle</SelectItem>
                                <SelectItem value="OFFLINE">Offline</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={clearFilters}>
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
                            <CardTitle>Buses ({processedBuses.length})</CardTitle>
                            <CardDescription>All buses with real-time status and details</CardDescription>
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
                                    <SortableHeader column="licensePlate">Vehicle</SortableHeader>
                                    <SortableHeader column="status">Status</SortableHeader>
                                    <SortableHeader column="route">Route</SortableHeader>
                                    <SortableHeader column="driver">Driver</SortableHeader>
                                    <SortableHeader column="students">Students</SortableHeader>
                                    <TableHead>Last Update</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableLoadingRows />
                                ) : paginatedBuses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2">
                                                <Bus className="w-12 h-12 text-muted-foreground/50" />
                                                <p className="text-muted-foreground">No buses found</p>
                                                <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedBuses.map((bus, index) => (
                                    <TableRow key={bus.id} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? "bg-muted dark:bg-background/50" : ""}`}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className={cn("w-2.5 h-2.5 rounded-full", bus.status === "MOVING" ? "bg-green-500 animate-pulse" : bus.status === "IDLE" ? "bg-yellow-500" : "bg-red-500")} />
                                                <div>
                                                    <p className="font-semibold">{bus.licensePlate}</p>
                                                    <p className="text-xs text-muted-foreground">{bus.model}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(bus.status)}</TableCell>
                                        <TableCell>
                                            {bus.routeName ? (
                                                <div>
                                                    <p className="text-sm">{bus.routeName}</p>
                                                    <p className="text-xs text-muted-foreground">{bus.totalStops} stops</p>
                                                </div>
                                            ) : <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell>
                                            {bus.driver ? (
                                                <div>
                                                    <p className="text-sm font-medium">{bus.driver.name}</p>
                                                    {bus.driver.phone && (
                                                        <a href={`tel:${bus.driver.phone}`} className="text-xs text-blue-600 flex items-center gap-1">
                                                            <Phone className="w-3 h-3" />
                                                            {bus.driver.phone}
                                                        </a>
                                                    )}
                                                </div>
                                            ) : <span className="text-muted-foreground">-</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Users className="w-4 h-4 text-muted-foreground" />
                                                <span>{bus.assignedStudents}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                                <Clock className="w-3 h-3" />
                                                {formatTimeAgo(bus.secondsAgo, bus.status)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/transport/live-tracking/${bus.id}`}>
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View Details
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/dashboard/schools/transport/vehicles`}>
                                                            <Bus className="w-4 h-4 mr-2" />
                                                            Vehicle Info
                                                        </Link>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedBuses.length)} of {processedBuses.length} buses
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) pageNum = i + 1;
                                        else if (currentPage <= 3) pageNum = i + 1;
                                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                        else pageNum = currentPage - 2 + i;
                                        return (
                                            <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className="w-8 h-8 p-0">
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

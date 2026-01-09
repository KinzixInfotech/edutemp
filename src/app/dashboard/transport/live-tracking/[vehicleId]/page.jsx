"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { GoogleMap, useLoadScript, Marker, Polyline } from "@react-google-maps/api";
import { useState, useCallback, useRef, useEffect } from "react";
import { ArrowLeft, Bus, MapPin, Clock, Phone, User, Navigation, RefreshCw, Users, Route, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const mapContainerStyle = {
    width: "100%",
    height: "400px",
    borderRadius: "12px",
};

const libraries = ["places"];

// Bus marker icon based on status
const getBusIcon = (status) => ({
    url: status === "MOVING"
        ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='%2310B981' stroke='white' stroke-width='1.5'%3E%3Cpath d='M8 6v6m4-6v6m4-6v6M3 10h18M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6ZM7 18v2m10-2v2'/%3E%3C/svg%3E"
        : status === "IDLE"
            ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='%23F59E0B' stroke='white' stroke-width='1.5'%3E%3Cpath d='M8 6v6m4-6v6m4-6v6M3 10h18M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6ZM7 18v2m10-2v2'/%3E%3C/svg%3E"
            : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='%23EF4444' stroke='white' stroke-width='1.5'%3E%3Cpath d='M8 6v6m4-6v6m4-6v6M3 10h18M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6ZM7 18v2m10-2v2'/%3E%3C/svg%3E",
    scaledSize: { width: 48, height: 48 },
    anchor: { x: 24, y: 24 },
});

export default function SingleBusTrackingPage() {
    const { vehicleId } = useParams();
    const router = useRouter();
    const mapRef = useRef(null);
    const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 });

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries,
    });

    // Fetch bus location with polling
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["bus-location-detail", vehicleId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/transport/location/${vehicleId}?history=true&includeDriver=true`);
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
        enabled: !!vehicleId,
        refetchInterval: 10000, // Poll every 10 seconds
        staleTime: 10000,
    });

    const vehicle = data?.vehicle;
    const location = data?.currentLocation;
    const activeTrip = data?.activeTrip;
    const driver = data?.driver || activeTrip?.driver; // Driver from assignment or active trip
    const conductor = data?.conductor || activeTrip?.conductor;
    const stops = activeTrip?.route?.busStops || data?.stops || [];
    const status = data?.status || "OFFLINE";
    const secondsAgo = data?.secondsAgo;
    const routeName = activeTrip?.route?.name || data?.routeName;
    const assignedStudents = data?.assignedStudents || 0;

    // Create route polyline from stops
    const routePath = stops.map(stop => ({
        lat: stop.latitude,
        lng: stop.longitude,
    })).filter(p => p.lat && p.lng);

    // Center map on bus location
    useEffect(() => {
        if (location?.latitude && location?.longitude) {
            const newCenter = { lat: location.latitude, lng: location.longitude };
            setMapCenter(newCenter);
            if (mapRef.current) {
                mapRef.current.panTo(newCenter);
            }
        }
    }, [location?.latitude, location?.longitude]);

    const onMapLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    const formatTimeAgo = (seconds, status) => {
        if (!seconds && seconds !== 0) {
            return status === "OFFLINE" ? "No data yet" : "N/A";
        }
        if (seconds < 60) return `${seconds} seconds ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        return `${Math.floor(seconds / 3600)} hours ago`;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case "MOVING": return <Badge className="bg-green-100 text-green-800 text-lg px-4 py-1">🟢 Moving</Badge>;
            case "IDLE": return <Badge className="bg-yellow-100 text-yellow-800 text-lg px-4 py-1">🟡 Idle</Badge>;
            default: return <Badge className="bg-red-100 text-red-800 text-lg px-4 py-1">🔴 Offline</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Bus className="w-6 h-6" />
                        {vehicle?.licensePlate || "Bus Details"}
                    </h1>
                    <p className="text-muted-foreground">{vehicle?.model}</p>
                </div>
                {getStatusBadge(status)}
                <Button onClick={() => refetch()} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Status Banner */}
            <Card className={cn(
                "border-l-4",
                status === "MOVING" ? "border-l-green-500 bg-green-50 dark:bg-green-950/20" :
                    status === "IDLE" ? "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" :
                        "border-l-red-500 bg-red-50 dark:bg-red-950/20"
            )}>
                <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <div>
                            <span className="text-lg">Last updated: <strong>{formatTimeAgo(secondsAgo, status)}</strong></span>
                            {status === "OFFLINE" && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    Bus has not sent location data yet or tracking device is inactive.
                                </p>
                            )}
                        </div>
                    </div>
                    {location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)}
                            {location.speed && <span className="ml-2">| {(location.speed * 3.6).toFixed(1)} km/h</span>}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Map */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <Navigation className="w-5 h-5" />
                        Live Location
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
                            <GoogleMap
                                mapContainerStyle={mapContainerStyle}
                                center={mapCenter}
                                zoom={15}
                                onLoad={onMapLoad}
                                options={{
                                    streetViewControl: false,
                                    mapTypeControl: false,
                                }}
                            >
                                {/* Bus Marker */}
                                {location && (
                                    <Marker
                                        position={{ lat: location.latitude, lng: location.longitude }}
                                        icon={getBusIcon(status)}
                                        title={vehicle?.licensePlate}
                                    />
                                )}

                                {/* Route Polyline */}
                                {routePath.length > 1 && (
                                    <Polyline
                                        path={routePath}
                                        options={{
                                            strokeColor: "#3B82F6",
                                            strokeOpacity: 0.8,
                                            strokeWeight: 4,
                                        }}
                                    />
                                )}

                                {/* Stop Markers */}
                                {stops.map((stop, index) => (
                                    stop.latitude && stop.longitude && (
                                        <Marker
                                            key={stop.id}
                                            position={{ lat: stop.latitude, lng: stop.longitude }}
                                            label={{
                                                text: String(index + 1),
                                                color: "white",
                                                fontWeight: "bold",
                                            }}
                                            icon={{
                                                path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
                                                fillColor: index === 0 ? "#10B981" : index === stops.length - 1 ? "#EF4444" : "#3B82F6",
                                                fillOpacity: 1,
                                                strokeColor: "white",
                                                strokeWeight: 2,
                                                scale: 1.5,
                                                labelOrigin: { x: 12, y: 10 },
                                            }}
                                            title={stop.name}
                                        />
                                    )
                                ))}
                            </GoogleMap>

                            {/* Overlay when bus is offline/no location */}
                            {!location && (
                                <div className="absolute inset-0 bg-gray-900/60 rounded-xl flex flex-col items-center justify-center pointer-events-none">
                                    <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg px-6 py-4 text-center shadow-lg">
                                        <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2 animate-pulse" />
                                        <p className="font-semibold text-lg">Waiting for live location...</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Bus has not sent location data yet.
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

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Driver Profile Card - Always show if driver exists */}
                {driver && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Driver
                            </CardTitle>
                            <CardDescription>
                                {activeTrip ? "Currently on trip" : "Assigned driver"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16">
                                    <AvatarFallback className="text-xl bg-blue-100 text-blue-600">
                                        {driver.name?.charAt(0) || "D"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="text-lg font-semibold">{driver.name}</p>
                                    {driver.contactNumber && (
                                        <a href={`tel:${driver.contactNumber}`} className="text-blue-600 flex items-center gap-1 hover:underline">
                                            <Phone className="w-4 h-4" />
                                            {driver.contactNumber}
                                        </a>
                                    )}
                                    {driver.licenseNumber && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            License: {driver.licenseNumber}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Conductor Profile Card */}
                {conductor && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Conductor
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <Avatar className="w-14 h-14">
                                    <AvatarFallback className="bg-purple-100 text-purple-600">
                                        {conductor.name?.charAt(0) || "C"}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{conductor.name}</p>
                                    {conductor.contactNumber && (
                                        <a href={`tel:${conductor.contactNumber}`} className="text-sm text-blue-600 flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {conductor.contactNumber}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Route Info */}
                {routeName && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Route className="w-5 h-5" />
                                Route
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Name</span>
                                <span className="font-medium">{routeName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Total Stops</span>
                                <Badge variant="outline">{stops.length}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Assigned Students</span>
                                <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">{assignedStudents}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Active Trip Info */}
                {activeTrip && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Navigation className="w-5 h-5 text-green-500" />
                                Active Trip
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Trip Type</span>
                                <Badge className={activeTrip.tripType === "PICKUP" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}>
                                    {activeTrip.tripType}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Started</span>
                                <span>{activeTrip.startedAt ? new Date(activeTrip.startedAt).toLocaleTimeString() : "N/A"}</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* No Driver Assigned Warning */}
                {!driver && (
                    <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                        <CardContent className="py-6">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-8 h-8 text-yellow-500" />
                                <div>
                                    <p className="font-semibold">No Driver Assigned</p>
                                    <p className="text-sm text-muted-foreground">
                                        This bus does not have a driver assigned yet.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Route Stops */}
            {stops.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5" />
                            Route Stops ({stops.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {stops.map((stop, index) => (
                                <div key={stop.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0",
                                        index === 0 ? "bg-green-500" : index === stops.length - 1 ? "bg-red-500" : "bg-blue-500"
                                    )}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{stop.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {activeTrip?.tripType === "PICKUP" ? stop.pickupTime : stop.dropTime}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

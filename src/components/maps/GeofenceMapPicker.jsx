'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Circle, GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, LocateFixed, MapPin, Navigation, Search, X } from 'lucide-react';

const containerStyle = {
    width: '100%',
    height: '420px',
    borderRadius: '16px',
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 };
const mapOptions = {
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    clickableIcons: false,
};

const allowedCircleOptions = {
    strokeColor: '#16a34a',
    strokeOpacity: 0.9,
    strokeWeight: 2,
    fillColor: '#22c55e',
    fillOpacity: 0.22,
};

const dangerCircleOptions = {
    strokeColor: '#dc2626',
    strokeOpacity: 0.7,
    strokeWeight: 1.5,
    fillColor: '#ef4444',
    fillOpacity: 0.12,
};

function isValidCoordinate(lat, lng) {
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export default function GeofenceMapPicker({
    latitude,
    longitude,
    radius,
    testLatitude,
    testLongitude,
    onSchoolLocationChange,
    onTestLocationChange,
    className = '',
}) {
    const schoolPosition = useMemo(() => {
        const lat = Number(latitude);
        const lng = Number(longitude);
        return isValidCoordinate(lat, lng) ? { lat, lng } : null;
    }, [latitude, longitude]);

    const testPosition = useMemo(() => {
        const lat = Number(testLatitude);
        const lng = Number(testLongitude);
        return isValidCoordinate(lat, lng) ? { lat, lng } : null;
    }, [testLatitude, testLongitude]);

    const allowedRadius = Math.max(Number(radius) || 0, 0);
    const dangerRadius = allowedRadius > 0 ? Math.round(allowedRadius * 1.35) : 0;

    const [searchValue, setSearchValue] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isLocatingSchool, setIsLocatingSchool] = useState(false);
    const [isLocatingTest, setIsLocatingTest] = useState(false);

    const mapRef = useRef(null);
    const geocoderRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        id: 'attendance-geofence-map',
    });

    useEffect(() => {
        if (isLoaded && window.google) {
            geocoderRef.current = new window.google.maps.Geocoder();
        }
    }, [isLoaded]);

    const fitMapToGeofence = useCallback(() => {
        if (!mapRef.current || !schoolPosition || !window.google) return;

        const bounds = new window.google.maps.LatLngBounds();
        const center = new window.google.maps.LatLng(schoolPosition.lat, schoolPosition.lng);
        bounds.extend(center);

        if (dangerRadius > 0) {
            const circle = new window.google.maps.Circle({
                center,
                radius: dangerRadius,
            });
            const circleBounds = circle.getBounds();
            if (circleBounds) bounds.union(circleBounds);
        }

        if (testPosition) {
            bounds.extend(new window.google.maps.LatLng(testPosition.lat, testPosition.lng));
        }

        mapRef.current.fitBounds(bounds, 60);
    }, [schoolPosition, testPosition, dangerRadius]);

    useEffect(() => {
        fitMapToGeofence();
    }, [fitMapToGeofence]);

    const searchPlaces = useCallback((query) => {
        if (!query.trim() || !geocoderRef.current) return;

        setIsSearching(true);
        geocoderRef.current.geocode(
            {
                address: query,
                componentRestrictions: { country: 'IN' },
            },
            (results, status) => {
                setIsSearching(false);
                if (status === 'OK' && results?.length) {
                    setSearchResults(results.slice(0, 5).map((result) => ({
                        address: result.formatted_address,
                        lat: result.geometry.location.lat(),
                        lng: result.geometry.location.lng(),
                    })));
                    setShowResults(true);
                    return;
                }
                setSearchResults([]);
                setShowResults(false);
            }
        );
    }, []);

    const handleSearchChange = (event) => {
        const value = event.target.value;
        setSearchValue(value);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (value.trim().length < 3) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(() => {
            searchPlaces(value);
        }, 400);
    };

    const reverseGeocode = useCallback((lat, lng) => {
        if (!geocoderRef.current) return;
        geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
                setSearchValue(results[0].formatted_address);
            }
        });
    }, []);

    const handleSchoolSelect = useCallback((lat, lng, address = '') => {
        if (address) setSearchValue(address);
        onSchoolLocationChange?.(lat, lng, address);
    }, [onSchoolLocationChange]);

    const handleSearchResultClick = (result) => {
        handleSchoolSelect(result.lat, result.lng, result.address);
        setShowResults(false);
    };

    const handleMapClick = useCallback((event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        handleSchoolSelect(lat, lng);
        reverseGeocode(lat, lng);
    }, [handleSchoolSelect, reverseGeocode]);

    const handleGetCurrentLocation = (target) => {
        if (!navigator.geolocation) {
            window.alert('Geolocation is not supported by your browser.');
            return;
        }

        if (target === 'school') setIsLocatingSchool(true);
        if (target === 'test') setIsLocatingTest(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                if (target === 'school') {
                    handleSchoolSelect(lat, lng);
                    reverseGeocode(lat, lng);
                    setIsLocatingSchool(false);
                } else {
                    onTestLocationChange?.(lat, lng);
                    setIsLocatingTest(false);
                }
            },
            () => {
                window.alert('Unable to get your location. Please allow location access and try again.');
                setIsLocatingSchool(false);
                setIsLocatingTest(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    if (loadError) {
        return (
            <div className={`rounded-xl border border-yellow-300 bg-yellow-50 p-4 ${className}`}>
                <p className="text-sm text-yellow-800">
                    Google Maps could not be loaded. You can still enter latitude, longitude, and radius manually below.
                </p>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className={`flex h-[420px] items-center justify-center rounded-xl border bg-muted ${className}`}>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        value={searchValue}
                        onChange={handleSearchChange}
                        onFocus={() => searchResults.length > 0 && setShowResults(true)}
                        placeholder="Search school location on Google Maps..."
                        className="bg-white pl-10 pr-10"
                    />
                    {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                    {showResults && searchResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-white shadow-lg">
                            <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2">
                                <span className="text-xs text-muted-foreground">Search Results</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowResults(false)}>
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                            {searchResults.map((result, index) => (
                                <button
                                    key={`${result.lat}-${result.lng}-${index}`}
                                    type="button"
                                    onClick={() => handleSearchResultClick(result)}
                                    className="flex w-full items-start gap-2 border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/50 last:border-b-0"
                                >
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                                    <span className="text-sm">{result.address}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleGetCurrentLocation('school')}
                    disabled={isLocatingSchool}
                >
                    {isLocatingSchool ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
                    Use Current Location
                </Button>

                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleGetCurrentLocation('test')}
                    disabled={isLocatingTest}
                >
                    {isLocatingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
                    Set Test Point
                </Button>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="overflow-hidden rounded-2xl border shadow-sm">
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={schoolPosition || testPosition || defaultCenter}
                        zoom={schoolPosition ? 16 : 5}
                        onLoad={(map) => {
                            mapRef.current = map;
                            fitMapToGeofence();
                        }}
                        onClick={handleMapClick}
                        options={mapOptions}
                    >
                        {schoolPosition && (
                            <>
                                {dangerRadius > 0 && (
                                    <Circle center={schoolPosition} radius={dangerRadius} options={dangerCircleOptions} />
                                )}
                                {allowedRadius > 0 && (
                                    <Circle center={schoolPosition} radius={allowedRadius} options={allowedCircleOptions} />
                                )}
                                <Marker position={schoolPosition} />
                            </>
                        )}

                        {testPosition && (
                            <Marker
                                position={testPosition}
                                icon={{
                                    path: window.google.maps.SymbolPath.CIRCLE,
                                    fillColor: '#2563eb',
                                    fillOpacity: 1,
                                    strokeColor: '#ffffff',
                                    strokeWeight: 2,
                                    scale: 8,
                                }}
                            />
                        )}
                    </GoogleMap>
                </div>

                <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                    <div>
                        <p className="text-sm font-semibold">Map Guide</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Search, click on the map, or use current location to place the school geofence center.
                        </p>
                    </div>

                    <div className="space-y-2 rounded-xl border bg-background p-3">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="h-3 w-3 rounded-full bg-green-500" />
                            <span>Allowed zone</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Staff can mark attendance inside the green radius.
                        </p>
                    </div>

                    <div className="space-y-2 rounded-xl border bg-background p-3">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="h-3 w-3 rounded-full bg-red-500" />
                            <span>Danger zone</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            The red buffer shows the area just outside the allowed radius for quick visual caution.
                        </p>
                    </div>

                    <div className="space-y-2 rounded-xl border bg-background p-3">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="h-3 w-3 rounded-full bg-blue-600" />
                            <span>Test point</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Use this to preview whether a live location falls inside or outside the geofence.
                        </p>
                    </div>

                    {schoolPosition && (
                        <div className="rounded-xl border bg-background p-3">
                            <p className="text-xs font-medium text-muted-foreground">School Coordinates</p>
                            <p className="mt-1 font-mono text-xs">
                                {schoolPosition.lat.toFixed(6)}, {schoolPosition.lng.toFixed(6)}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

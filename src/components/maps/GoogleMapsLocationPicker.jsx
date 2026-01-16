'use client';

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Search, LocateFixed, X } from 'lucide-react';

// Default map container style
const containerStyle = {
    width: '100%',
    height: '300px',
    borderRadius: '12px',
};

// Default center (India)
const defaultCenter = {
    lat: 20.5937,
    lng: 78.9629,
};

// Map options for clean UI
const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    clickableIcons: false,
};

// Memoized map component to prevent unnecessary re-renders
const MapComponent = memo(function MapComponent({
    center,
    zoom,
    onMapClick,
    onMapLoad,
    markerPosition,
    isLoaded,
}) {
    if (!isLoaded) return null;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={zoom}
            onClick={onMapClick}
            onLoad={onMapLoad}
            options={mapOptions}
        >
            {markerPosition && window.google && (
                <Marker
                    position={markerPosition}
                    animation={window.google?.maps?.Animation?.DROP}
                />
            )}
        </GoogleMap>
    );
});

export default function GoogleMapsLocationPicker({
    latitude,
    longitude,
    onLocationChange,
    placeholder = 'Search for a location...',
    className = '',
}) {
    const [searchValue, setSearchValue] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [markerPosition, setMarkerPosition] = useState(
        latitude && longitude ? { lat: parseFloat(latitude), lng: parseFloat(longitude) } : null
    );
    const [mapCenter, setMapCenter] = useState(
        latitude && longitude
            ? { lat: parseFloat(latitude), lng: parseFloat(longitude) }
            : defaultCenter
    );
    const [zoom, setZoom] = useState(latitude && longitude ? 15 : 5);
    const [isLocating, setIsLocating] = useState(false);
    const [mapError, setMapError] = useState(null);

    const mapRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const geocoderRef = useRef(null);

    // Load Google Maps API (without Places library since it's deprecated)
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        id: 'google-maps-script',
    });

    // Initialize geocoder when loaded
    useEffect(() => {
        if (isLoaded && window.google) {
            geocoderRef.current = new window.google.maps.Geocoder();
        }
    }, [isLoaded]);

    // Update marker when props change
    useEffect(() => {
        if (latitude && longitude) {
            const newPos = { lat: parseFloat(latitude), lng: parseFloat(longitude) };
            setMarkerPosition(newPos);
            setMapCenter(newPos);
            setZoom(15);
        }
    }, [latitude, longitude]);

    const handleLocationSelect = useCallback((lat, lng, address = '') => {
        const newPosition = { lat, lng };
        setMarkerPosition(newPosition);
        setMapCenter(newPosition);
        setZoom(17);
        if (address) setSearchValue(address);
        setShowResults(false);
        onLocationChange?.(lat, lng, address);
    }, [onLocationChange]);

    // Search using Geocoder (works without Places API)
    const handleSearch = useCallback((query) => {
        if (!query.trim() || !geocoderRef.current) return;

        setIsSearching(true);
        geocoderRef.current.geocode(
            {
                address: query,
                componentRestrictions: { country: 'IN' } // Restrict to India
            },
            (results, status) => {
                setIsSearching(false);
                if (status === 'OK' && results) {
                    setSearchResults(results.slice(0, 5).map(result => ({
                        address: result.formatted_address,
                        lat: result.geometry.location.lat(),
                        lng: result.geometry.location.lng(),
                    })));
                    setShowResults(true);
                } else {
                    setSearchResults([]);
                }
            }
        );
    }, []);

    // Debounced search on input change
    const handleSearchInputChange = (e) => {
        const value = e.target.value;
        setSearchValue(value);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (value.trim().length > 2) {
            searchTimeoutRef.current = setTimeout(() => {
                handleSearch(value);
            }, 500);
        } else {
            setSearchResults([]);
            setShowResults(false);
        }
    };

    // Handle map click
    const handleMapClick = useCallback((e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        handleLocationSelect(lat, lng);

        // Reverse geocode to get address
        if (geocoderRef.current) {
            geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    setSearchValue(results[0].formatted_address);
                    onLocationChange?.(lat, lng, results[0].formatted_address);
                }
            });
        }
    }, [handleLocationSelect, onLocationChange]);

    // Handle map load
    const handleMapLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    // Get current location
    const handleGetCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                handleLocationSelect(lat, lng);
                setIsLocating(false);

                // Reverse geocode
                if (geocoderRef.current) {
                    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
                        if (status === 'OK' && results[0]) {
                            setSearchValue(results[0].formatted_address);
                            onLocationChange?.(lat, lng, results[0].formatted_address);
                        }
                    });
                }
            },
            (error) => {
                console.error('Error getting location:', error);
                alert('Unable to get your location. Please enable location permissions.');
                setIsLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, [handleLocationSelect, onLocationChange]);

    // Handle search result selection
    const handleResultClick = (result) => {
        handleLocationSelect(result.lat, result.lng, result.address);
    };

    if (loadError) {
        return (
            <div className="p-4 text-center bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
                    Google Maps couldn't load. You can still enter coordinates manually.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <Input
                        type="number"
                        step="any"
                        placeholder="Latitude (e.g., 28.6139)"
                        value={markerPosition?.lat || ''}
                        onChange={(e) => {
                            const lat = parseFloat(e.target.value);
                            if (!isNaN(lat)) {
                                onLocationChange?.(lat, markerPosition?.lng || 0, '');
                            }
                        }}
                    />
                    <Input
                        type="number"
                        step="any"
                        placeholder="Longitude (e.g., 77.2090)"
                        value={markerPosition?.lng || ''}
                        onChange={(e) => {
                            const lng = parseFloat(e.target.value);
                            if (!isNaN(lng)) {
                                onLocationChange?.(markerPosition?.lat || 0, lng, '');
                            }
                        }}
                    />
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                    type="text"
                    placeholder={placeholder}
                    value={searchValue}
                    onChange={handleSearchInputChange}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    className="pl-10 pr-28 bg-white dark:bg-muted"
                />
                {isSearching && (
                    <Loader2 className="absolute right-24 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2"
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    title="Use current location"
                >
                    {isLocating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <LocateFixed className="h-4 w-4 mr-1" />
                            <span className="text-xs hidden sm:inline">My Location</span>
                        </>
                    )}
                </Button>

                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border rounded-lg shadow-lg max-h-60 overflow-auto">
                        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
                            <span className="text-xs text-muted-foreground">Search Results</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => setShowResults(false)}
                            >
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                        {searchResults.map((result, index) => (
                            <button
                                key={index}
                                type="button"
                                className="w-full px-3 py-2.5 text-left hover:bg-muted/50 flex items-start gap-2 border-b last:border-b-0 transition-colors"
                                onClick={() => handleResultClick(result)}
                            >
                                <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm line-clamp-2">{result.address}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Map */}
            <div className="relative rounded-xl overflow-hidden border shadow-sm">
                <MapComponent
                    center={mapCenter}
                    zoom={zoom}
                    onMapClick={handleMapClick}
                    onMapLoad={handleMapLoad}
                    markerPosition={markerPosition}
                    isLoaded={isLoaded}
                />

                {/* Coordinates Display */}
                {markerPosition && (
                    <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border">
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-red-500" />
                            <span className="font-mono text-xs">
                                {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Help Text */}
            <p className="text-xs text-muted-foreground">
                Search for a location, click on the map, or use your current location to set coordinates.
            </p>
        </div>
    );
}

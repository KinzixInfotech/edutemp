'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, AlertCircle, CheckCircle, MapPin, Search, School, Navigation, X, ChevronLeft, ChevronRight } from "lucide-react";
import { InteractiveGridPattern } from "@/components/ui/interactive-grid-pattern";
import { useRouter } from "next/navigation";

const SCHOOLS_PER_PAGE = 4;

const Hero = () => {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState("");
    const [schoolFound, setSchoolFound] = useState(null);

    // School search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [nearbySchools, setNearbySchools] = useState([]);
    const [locationLoading, setLocationLoading] = useState(false);
    const [userCity, setUserCity] = useState("");
    const [currentPage, setCurrentPage] = useState(0);
    const searchTimeout = useRef(null);

    // ─── Fetch nearby schools via navigator.geolocation ───
    const fetchNearbySchools = useCallback(async () => {
        if (!navigator.geolocation) return;

        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;

                    // Reverse geocode using OpenStreetMap Nominatim
                    const geoRes = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
                        { headers: { 'Accept-Language': 'en' } }
                    );
                    const geoData = await geoRes.json();
                    const address = geoData?.address || {};

                    const searchTerms = [
                        address.city,
                        address.town,
                        address.county,
                        address.state_district,
                        address.state,
                    ].filter(Boolean);

                    const displayCity = address.city || address.town || address.county || address.state_district || '';
                    setUserCity(displayCity);

                    if (searchTerms.length === 0) {
                        setLocationLoading(false);
                        return;
                    }

                    const allSchools = new Map();
                    for (const term of searchTerms) {
                        try {
                            const res = await fetch(`/api/schools/search?q=${encodeURIComponent(term)}`);
                            const data = await res.json();
                            (data?.schools || []).forEach((s) => allSchools.set(s.id, s));
                        } catch { }
                    }

                    setNearbySchools(Array.from(allSchools.values()));
                } catch (err) {
                    console.log('Location fetch error:', err);
                } finally {
                    setLocationLoading(false);
                }
            },
            () => setLocationLoading(false),
            { enableHighAccuracy: false, timeout: 10000 }
        );
    }, []);

    useEffect(() => {
        fetchNearbySchools();
    }, [fetchNearbySchools]);

    // ─── Debounced School Search ───
    const handleSearch = useCallback((text) => {
        setSearchQuery(text);
        setCurrentPage(0);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (text.trim().length < 2) {
            setSearchResults([]);
            setSearching(false);
            return;
        }

        setSearching(true);

        searchTimeout.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/schools/search?q=${encodeURIComponent(text.trim())}`);
                const data = await res.json();
                setSearchResults(data?.schools || []);
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    }, []);

    // ─── Handle School Selection ───
    const handleSchoolSelect = (school) => {
        const parts = school.schoolCode.split('-');
        const codeDigits = parts.slice(1).join('-') || '';
        setCode(codeDigits);
        setSchoolFound(school);
        setSearchQuery("");
        setSearchResults([]);

        sessionStorage.setItem('loginSchool', JSON.stringify(school));
        setTimeout(() => {
            router.push(`/login?schoolCode=${school.schoolCode}`);
        }, 600);
    };

    // ─── Code Entry Submit ───
    const handleContinue = async () => {
        if (!code) return;

        setIsChecking(true);
        setError("");
        setSchoolFound(null);

        try {
            const fullCode = `EB-${code}`;
            const res = await fetch(`/api/schools/by-code?schoolcode=${fullCode}`);
            const data = await res.json();

            if (res.ok && data.school) {
                setSchoolFound(data.school);
                sessionStorage.setItem('loginSchool', JSON.stringify(data.school));
                setTimeout(() => {
                    router.push(`/login?schoolCode=${fullCode}`);
                }, 500);
            } else {
                setError("School not found. Please check your code and try again.");
            }
        } catch (err) {
            console.error("Error checking school:", err);
            setError("Unable to verify school. Please try again.");
        } finally {
            setIsChecking(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && code) handleContinue();
    };

    // Determine which schools to show
    const displaySchools = searchQuery.trim().length >= 2 ? searchResults : nearbySchools;
    const totalPages = Math.ceil(displaySchools.length / SCHOOLS_PER_PAGE);
    const paginatedSchools = displaySchools.slice(
        currentPage * SCHOOLS_PER_PAGE,
        (currentPage + 1) * SCHOOLS_PER_PAGE
    );
    const hasSchools = displaySchools.length > 0;
    const isSearchActive = searchQuery.trim().length >= 2;

    return (
        <section className="relative min-h-screen mt-6 md:mt-18 border-b flex overflow-hidden bg-white">
            {/* LEFT SIDE - Decorative */}
            <div className="hidden lg:flex flex-1 relative items-center justify-center bg-[#f5f7fa]">
                <InteractiveGridPattern
                    className="absolute opacity-50 inset-0 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,white_20%,transparent_70%)]"
                    squares={[40, 40]}
                />

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <span className="text-[clamp(10rem,22vw,20rem)] font-black text-gray-200/50 leading-none tracking-tighter">
                        ERP
                    </span>
                </div>

                <div className="relative z-10 text-center px-12">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] mb-4">
                        School Login Portal
                    </h2>
                    <p className="text-gray-500 text-base md:text-lg max-w-md mx-auto">
                        Access your school's complete management system with your unique school code
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="flex-1 flex items-center justify-center px-4 md:px-6 py-8 md:py-12 lg:py-0">
                <div className="w-full max-w-md space-y-5">

                    {/* ─── Search Bar (always visible) ─── */}
                    <div>
                        <div className="flex items-center gap-2 bg-[#f8f9fb] border border-gray-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-[#0569ff]/20 focus-within:border-[#0569ff] transition-all">
                            <Search className="w-4 h-4 text-gray-400 shrink-0" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Search school by name, city, or code..."
                                className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder:text-gray-400"
                            />
                            {searchQuery && (
                                <button onClick={() => { setSearchQuery(''); setSearchResults([]); setCurrentPage(0); }} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                    <X className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                            )}
                            {searching && <Loader2 className="w-4 h-4 text-[#0569ff] animate-spin shrink-0" />}
                        </div>
                    </div>

                    {/* ─── Schools Section (always visible) ─── */}
                    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-none">
                        {/* Header */}
                        <div className="px-4 py-2.5 bg-gray-50/80 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {isSearchActive ? (
                                    <Search className="w-3.5 h-3.5 text-[#0569ff]" />
                                ) : (
                                    <MapPin className="w-3.5 h-3.5 text-[#0569ff]" />
                                )}
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {isSearchActive
                                        ? `${displaySchools.length} result${displaySchools.length !== 1 ? 's' : ''} found`
                                        : locationLoading
                                            ? 'Detecting location...'
                                            : userCity
                                                ? `Schools near ${userCity}`
                                                : 'Nearby Schools'}
                                </p>
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                                        disabled={currentPage === 0}
                                        className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                    <span className="text-xs text-gray-400 font-medium tabular-nums min-w-[40px] text-center">
                                        {currentPage + 1}/{totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                                        disabled={currentPage >= totalPages - 1}
                                        className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* School List */}
                        <div className="divide-y divide-gray-50">
                            {locationLoading && !isSearchActive && (
                                <div className="flex items-center justify-center gap-2 py-10 text-gray-400">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-sm">Finding schools near you...</span>
                                </div>
                            )}

                            {!locationLoading && !searching && !hasSchools && !isSearchActive && (
                                <div className="py-8 text-center px-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                                        <Navigation className="w-5 h-5 text-[#0569ff]" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-600">Enable location to find nearby schools</p>
                                    <button
                                        onClick={fetchNearbySchools}
                                        className="mt-3 text-xs font-semibold text-[#0569ff] hover:text-[#0358dd] transition-colors"
                                    >
                                        Allow Location Access →
                                    </button>
                                </div>
                            )}

                            {!searching && isSearchActive && !hasSchools && (
                                <div className="py-8 text-center">
                                    <School className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">No schools found</p>
                                    <p className="text-xs text-gray-300 mt-1">Try a different search term</p>
                                </div>
                            )}

                            {paginatedSchools.map((school) => (
                                <button
                                    key={school.id}
                                    onClick={() => handleSchoolSelect(school)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0569ff]/[0.03] transition-all text-left group/item"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0569ff]/10 to-[#0569ff]/5 flex items-center justify-center shrink-0 group-hover/item:from-[#0569ff]/20 group-hover/item:to-[#0569ff]/10 transition-colors overflow-hidden">
                                        {school.profilePicture ? (
                                            <img
                                                src={school.profilePicture}
                                                alt=""
                                                className="w-full h-full object-cover rounded-xl"
                                            />
                                        ) : (
                                            <School className="w-5 h-5 text-[#0569ff]" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate group-hover/item:text-[#0569ff] transition-colors">
                                            {school.name}
                                        </p>
                                        {school.location && (
                                            <span className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                                <MapPin className="w-3 h-3 shrink-0" />
                                                <span className="truncate">{school.location}</span>
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs font-mono font-bold text-[#0569ff]/60 bg-[#0569ff]/5 px-2 py-1 rounded-lg shrink-0">
                                        {school.schoolCode}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ─── OR Divider ─── */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">or enter code</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* ─── School Code Input ─── */}
                    <label className="block text-sm font-semibold text-[#1a1a2e]">
                        School Code *
                    </label>

                    <div className={`flex items-center gap-2 md:gap-3 bg-[#f8f9fb] border rounded-xl px-3 py-3 md:px-4 md:py-4 transition-all ${error
                        ? 'border-red-300 ring-2 ring-red-100'
                        : schoolFound
                            ? 'border-green-300 ring-2 ring-green-100'
                            : 'border-gray-200 focus-within:ring-2 focus-within:ring-[#0569ff]/20 focus-within:border-[#0569ff]'
                        }`}>
                        <div className="text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm bg-[#0569ff] shrink-0">
                            EB -
                        </div>
                        <input
                            type="text"
                            placeholder="Enter code (e.g., 0001)"
                            value={code}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                setCode(value);
                                setError("");
                                setSchoolFound(null);
                            }}
                            onKeyDown={handleKeyDown}
                            disabled={isChecking}
                            className="flex-1 bg-transparent text-base md:text-lg font-semibold outline-none text-[#1a1a2e] placeholder:text-gray-400 placeholder:font-normal disabled:opacity-50 min-w-0"
                        />
                        {isChecking && (
                            <Loader2 className="w-4 h-4 md:w-5 md:h-5 text-[#0569ff] animate-spin shrink-0" />
                        )}
                        {schoolFound && !isChecking && (
                            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 shrink-0" />
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-lg">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Success Message */}
                    {schoolFound && !isChecking && (
                        <div className="flex items-center gap-3 text-green-700 text-sm bg-green-50 px-4 py-3 rounded-lg">
                            <CheckCircle className="w-5 h-5 shrink-0" />
                            <div>
                                <p className="font-semibold">{schoolFound.name}</p>
                                <p className="text-green-600 text-xs">Redirecting to login...</p>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleContinue}
                        disabled={!code || isChecking}
                        className={`group w-full relative px-6 py-3.5 md:px-8 md:py-4 rounded-xl font-bold text-base transition-all duration-300 overflow-hidden flex items-center justify-center gap-3 ${code && !isChecking
                            ? 'bg-[#0569ff] text-white shadow-[0_4px_20px_rgba(5,105,255,0.3)] hover:shadow-[0_8px_30px_rgba(5,105,255,0.4)]'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        {code && !isChecking && (
                            <span className="absolute inset-0 bg-[#0358dd] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        )}

                        {isChecking ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Checking...</span>
                            </>
                        ) : (
                            <>
                                <span className="relative">Continue</span>
                                {code && (
                                    <ArrowRight className="relative w-5 h-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                                )}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Hero;
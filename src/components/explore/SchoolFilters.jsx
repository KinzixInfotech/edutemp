'use client';

import {
    Search, SlidersHorizontal, DollarSign, BookOpen,
    Building2, Sparkles, ChevronDown, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useState, useRef, useCallback, useEffect } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────

const BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'NIOS'];
const FACILITIES_LIST = ['Swimming Pool', 'Science Lab', 'Library', 'Sports Ground', 'Computer Lab', 'Auditorium'];
const EXTRACURRICULARS_LIST = ['Robotics', 'Debate', 'Arts', 'Music', 'Sports', 'Drama'];
const MAX_FEE = 600000;

// ── Helper ─────────────────────────────────────────────────────────────────

function formatSliderValue(val) {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
}

// Count how many filter groups are active
function countActiveFilters(filters) {
    let count = 0;
    if (filters.board) count++;
    if (filters.genderType) count++;
    if (filters.religiousAffiliation) count++;
    if (filters.minRating) count++;
    if (filters.minFee || filters.maxFee) count++;
    if (filters.facilities) count++;
    if (filters.extracurriculars) count++;
    return count;
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function SchoolFilters({ filters, onFilterChange, isOpen, setIsOpen }) {
    // sliderKey forces a remount (reset to defaultValue) only when filters are cleared externally
    const [sliderKey, setSliderKey] = useState(0);

    // These refs hold the current label values — updated during drag without re-rendering
    const minLabelRef = useRef(null);
    const maxLabelRef = useRef(null);

    // Track last committed values so we know when an external reset happened
    const committedRange = useRef([
        typeof filters.minFee === 'number' ? filters.minFee : 0,
        typeof filters.maxFee === 'number' ? filters.maxFee : MAX_FEE,
    ]);

    // When filters are externally reset (both become undefined), remount the slider
    useEffect(() => {
        if (filters.minFee === undefined && filters.maxFee === undefined) {
            committedRange.current = [0, MAX_FEE];
            setSliderKey(k => k + 1);
            if (minLabelRef.current) minLabelRef.current.textContent = formatSliderValue(0);
            if (maxLabelRef.current) maxLabelRef.current.textContent = `${formatSliderValue(MAX_FEE)}+`;
        }
    }, [filters.minFee, filters.maxFee]);

    // Local state for multi-select filters (derived from filters prop)
    const selectedFacilities = filters.facilities
        ? filters.facilities.split(',').filter(Boolean)
        : [];
    const selectedExtras = filters.extracurriculars
        ? filters.extracurriculars.split(',').filter(Boolean)
        : [];

    // ── Refs for debounce timers ────────────────────────────────────────────
    const searchDebounceRef = useRef(null);
    const sliderDebounceRef = useRef(null);

    useEffect(() => {
        return () => {
            clearTimeout(searchDebounceRef.current);
            clearTimeout(sliderDebounceRef.current);
        };
    }, []);

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleSearch = useCallback((value) => {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            onFilterChange({ search: value });
        }, 350);
    }, [onFilterChange]);

    // During drag: only update the DOM labels — zero React re-renders
    const handleSliderChange = useCallback((values) => {
        if (minLabelRef.current) minLabelRef.current.textContent = formatSliderValue(values[0]);
        if (maxLabelRef.current) {
            maxLabelRef.current.textContent = values[1] >= MAX_FEE
                ? `${formatSliderValue(MAX_FEE)}+`
                : formatSliderValue(values[1]);
        }
    }, []);

    // On release: fire the actual filter update once
    const handleSliderCommit = useCallback((values) => {
        committedRange.current = values;
        clearTimeout(sliderDebounceRef.current);
        sliderDebounceRef.current = setTimeout(() => {
            onFilterChange({
                minFee: values[0] > 0 ? values[0] : undefined,
                maxFee: values[1] < MAX_FEE ? values[1] : undefined,
            });
        }, 50);
    }, [onFilterChange]);

    const toggleFacility = useCallback((facility) => {
        const next = selectedFacilities.includes(facility)
            ? selectedFacilities.filter(f => f !== facility)
            : [...selectedFacilities, facility];
        onFilterChange({ facilities: next.join(',') || undefined });
    }, [selectedFacilities, onFilterChange]);

    const toggleExtra = useCallback((extra) => {
        const next = selectedExtras.includes(extra)
            ? selectedExtras.filter(e => e !== extra)
            : [...selectedExtras, extra];
        onFilterChange({ extracurriculars: next.join(',') || undefined });
    }, [selectedExtras, onFilterChange]);

    const clearFilters = useCallback(() => {
        committedRange.current = [0, MAX_FEE];
        setSliderKey(k => k + 1);
        if (minLabelRef.current) minLabelRef.current.textContent = formatSliderValue(0);
        if (maxLabelRef.current) maxLabelRef.current.textContent = `${formatSliderValue(MAX_FEE)}+`;
        onFilterChange({
            search: '',
            minFee: undefined,
            maxFee: undefined,
            minRating: undefined,
            board: undefined,
            genderType: undefined,
            religiousAffiliation: undefined,
            facilities: undefined,
            extracurriculars: undefined,
        });
    }, [onFilterChange]);

    const activeCount = countActiveFilters(filters);

    // ── FilterContent ────────────────────────────────────────────────────────

    const FilterContent = () => (
        <div className="space-y-6">

            {/* Search */}
            <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-[#0f172a]">Search Schools</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    <Input
                        placeholder="Name, city, district, pincode..."
                        defaultValue={filters.search || ''}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-9 h-10 text-[13px] rounded-lg border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Board */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                    <Label className="text-[13px] font-semibold text-[#0f172a]">Board</Label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {BOARDS.map((b) => {
                        const active = filters.board === b;
                        return (
                            <button
                                key={b}
                                onClick={() => onFilterChange({ board: active ? undefined : b })}
                                className={`text-[11px] px-3 py-1.5 rounded-full font-semibold transition-all duration-150 ${active
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                            >
                                {b}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Gender Type */}
            <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-[#0f172a]">School Type</Label>
                <div className="flex gap-2">
                    {['Co-ed', 'Boys', 'Girls'].map((g) => {
                        const active = filters.genderType === g;
                        return (
                            <button
                                key={g}
                                onClick={() => onFilterChange({ genderType: active ? undefined : g })}
                                className={`flex-1 h-9 text-[12px] font-semibold rounded-lg transition-all duration-150 ${active
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                            >
                                {g}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tuition Range */}
            {/* Tuition Range */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-blue-500" />
                    <Label className="text-[13px] font-semibold text-[#0f172a]">Tuition Range</Label>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 pt-4 pb-5">
                    <div className="flex justify-between text-[11px] font-semibold mb-4">
                        <span ref={minLabelRef} className="bg-white px-2 py-0.5 rounded-md border border-gray-200 text-gray-700">
                            {formatSliderValue(typeof filters.minFee === 'number' ? filters.minFee : 0)}
                        </span>
                        <span ref={maxLabelRef} className="bg-white px-2 py-0.5 rounded-md border border-gray-200 text-gray-700">
                            {typeof filters.maxFee === 'number' && filters.maxFee < MAX_FEE
                                ? formatSliderValue(filters.maxFee)
                                : `${formatSliderValue(MAX_FEE)}+`}
                        </span>
                    </div>
                    <Slider
                        key={sliderKey}
                        defaultValue={committedRange.current}
                        max={MAX_FEE}
                        step={5000}
                        onValueChange={handleSliderChange}
                        onValueCommit={handleSliderCommit}
                        className="[&_[role=slider]]:bg-blue-600 [&_[role=slider]]:border-blue-600 [&_[role=slider]]:w-5 [&_[role=slider]]:h-5 [&_[role=slider]]:shadow-md"
                    />
                </div>
            </div>

            {/* Facilities */}
            <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-blue-500" />
                    <Label className="text-[13px] font-semibold text-[#0f172a]">Facilities</Label>
                </div>
                <div className="space-y-1.5">
                    {FACILITIES_LIST.map((facility) => {
                        const checked = selectedFacilities.includes(facility);
                        return (
                            <label key={facility} className="flex items-center gap-2.5 cursor-pointer group select-none">
                                <div
                                    onClick={() => toggleFacility(facility)}
                                    className={`w-[17px] h-[17px] rounded border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'
                                        }`}
                                >
                                    {checked && (
                                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <span className="text-[13px] text-gray-600 group-hover:text-gray-800 transition-colors">
                                    {facility}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Extracurriculars */}
            <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    <Label className="text-[13px] font-semibold text-[#0f172a]">Extracurriculars</Label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {EXTRACURRICULARS_LIST.map((extra) => {
                        const active = selectedExtras.includes(extra);
                        return (
                            <button
                                key={extra}
                                onClick={() => toggleExtra(extra)}
                                className={`text-[11px] px-3 py-1.5 rounded-full font-semibold transition-all duration-150 ${active
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                            >
                                {extra}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Religious Affiliation */}
            <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-[#0f172a]">Religious Affiliation</Label>
                <div className="relative">
                    <select
                        value={filters.religiousAffiliation || ''}
                        onChange={(e) => onFilterChange({ religiousAffiliation: e.target.value || undefined })}
                        className="w-full h-10 px-3 pr-8 text-[13px] rounded-lg border border-gray-200 bg-white text-gray-700 appearance-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                        <option value="">Any</option>
                        <option value="Christian">Christian</option>
                        <option value="Islamic">Islamic</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Secular">Secular</option>
                        <option value="Sikh">Sikh</option>
                        <option value="Jain">Jain</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Minimum Rating */}
            <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-[#0f172a]">Minimum Rating</Label>
                <div className="flex gap-1.5">
                    {[4, 3, 2, 1].map((r) => {
                        const active = filters.minRating === String(r);
                        return (
                            <button
                                key={r}
                                onClick={() => onFilterChange({ minRating: active ? undefined : String(r) })}
                                className={`flex-1 h-9 text-[11px] font-semibold rounded-lg transition-all duration-150 ${active
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                            >
                                {r}+★
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* ── Desktop ── */}
            <div className="hidden lg:block">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[15px] font-bold text-[#0f172a]">Filters</h3>
                            {activeCount > 0 && (
                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                    {activeCount}
                                </span>
                            )}
                        </div>
                        {activeCount > 0 && (
                            <button
                                onClick={clearFilters}
                                className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                            >
                                <X className="w-3 h-3" />
                                Reset All
                            </button>
                        )}
                    </div>
                    <FilterContent />
                </div>
            </div>

            {/* ── Mobile ── */}
            <div className="lg:hidden">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full h-11 bg-white border-gray-200 text-[13px] font-semibold rounded-xl gap-2 shadow-sm"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Filters & Sort
                            {activeCount > 0 && (
                                <span className="ml-1 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                                    {activeCount}
                                </span>
                            )}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[calc(100%-24px)] max-w-md mx-auto rounded-2xl p-5 bg-white max-h-[88vh] overflow-y-auto">
                        <DialogHeader className="text-left mb-4">
                            <DialogTitle className="text-lg font-bold text-[#0f172a]">Filter Schools</DialogTitle>
                            <DialogDescription className="text-[13px] text-gray-400">
                                Narrow down your search
                            </DialogDescription>
                        </DialogHeader>
                        <FilterContent />
                        <div className="flex gap-2 mt-5">
                            {activeCount > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={clearFilters}
                                    className="flex-1 h-10 rounded-xl border-gray-200 text-[13px] font-semibold text-gray-600"
                                >
                                    Reset ({activeCount})
                                </Button>
                            )}
                            <Button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold shadow-sm"
                            >
                                Show Results
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
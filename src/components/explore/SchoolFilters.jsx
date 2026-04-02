'use client';

import { Search, SlidersHorizontal, DollarSign, X, ChevronDown, Building2, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useState, useRef, useCallback, useEffect } from 'react';

const facilities = ['Swimming Pool', 'Science Lab', 'Library', 'Sports Ground', 'Computer Lab', 'Auditorium'];
const extracurriculars = ['Robotics', 'Debate', 'Arts', 'Music', 'Sports', 'Drama'];

export default function SchoolFilters({ filters, onFilterChange, isOpen, setIsOpen }) {
    const [selectedFacilities, setSelectedFacilities] = useState([]);
    const [selectedExtras, setSelectedExtras] = useState([]);
    const sliderResetKey = `${filters.minFee ?? 0}-${filters.maxFee ?? 600000}`;
    const feeCommitDebounceRef = useRef(null);
    const [localRange, setLocalRange] = useState([
        typeof filters.minFee === 'number' ? filters.minFee : 0,
        typeof filters.maxFee === 'number' ? filters.maxFee : 600000,
    ]);

    useEffect(() => {
        setLocalRange([
            typeof filters.minFee === 'number' ? filters.minFee : 0,
            typeof filters.maxFee === 'number' ? filters.maxFee : 600000,
        ]);
    }, [filters.minFee, filters.maxFee]);

    const clearFilters = () => {
        onFilterChange({ search: '', location: '', minFee: '', maxFee: '', minRating: '', sort: '' });
        setSelectedFacilities([]);
        setSelectedExtras([]);
        setLocalRange([0, 600000]);
    };

    const toggleFacility = (facility) => {
        setSelectedFacilities(prev =>
            prev.includes(facility) ? prev.filter(f => f !== facility) : [...prev, facility]
        );
    };

    const toggleExtra = (extra) => {
        setSelectedExtras(prev =>
            prev.includes(extra) ? prev.filter(e => e !== extra) : [...prev, extra]
        );
    };

    const handleSliderChange = useCallback((values) => {
        setLocalRange(values);
    }, []);

    // Only after the drag ends do we schedule the real filter update.
    const handleSliderCommit = useCallback((values) => {
        if (feeCommitDebounceRef.current) clearTimeout(feeCommitDebounceRef.current);
        feeCommitDebounceRef.current = setTimeout(() => {
            onFilterChange({
                minFee: values[0] > 0 ? values[0] : '',
                maxFee: values[1] < 600000 ? values[1] : '',
            });
        }, 300);
    }, [onFilterChange]);

    useEffect(() => {
        return () => {
            if (feeCommitDebounceRef.current) clearTimeout(feeCommitDebounceRef.current);
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        };
    }, []);

    const formatSliderValue = (val) => {
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
        return `₹${val}`;
    };

    // Debounced search handler
    const searchDebounceRef = useRef(null);
    const handleSearch = useCallback((value) => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            onFilterChange({ search: value });
        }, 400);
    }, [onFilterChange]);

    const FilterContent = () => (
        <div className="space-y-6">
            {/* Search */}
            <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#0f172a]">Search Schools</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="School name or location..."
                        defaultValue={filters.search || ''}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10 h-10 text-sm rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Tuition Range — no filter/API update during drag; debounce after release */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                    <Label className="text-sm font-semibold text-[#0f172a]">Tuition Range</Label>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between text-xs font-medium text-gray-600 mb-3">
                        <span>{formatSliderValue(localRange[0])}</span>
                        <span>{formatSliderValue(localRange[1])}{localRange[1] >= 600000 ? '+' : ''}</span>
                    </div>
                    <Slider
                        key={sliderResetKey}
                        defaultValue={localRange}
                        max={600000}
                        step={10000}
                        onValueChange={handleSliderChange}
                        onValueCommit={handleSliderCommit}
                        className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-500 [&_[role=slider]]:shadow-md [&_[role=slider]]:w-5 [&_[role=slider]]:h-5"
                    />
                </div>
            </div>

            {/* Facilities */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <Label className="text-sm font-semibold text-[#0f172a]">Facilities</Label>
                </div>
                <div className="space-y-2">
                    {facilities.map((facility) => (
                        <label key={facility} className="flex items-center gap-2.5 cursor-pointer group">
                            <div className={`w-[18px] h-[18px] rounded border-2 transition-all flex items-center justify-center ${selectedFacilities.includes(facility)
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300 group-hover:border-blue-400'
                                }`}>
                                {selectedFacilities.includes(facility) && (
                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-[13px] text-gray-600">{facility}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Extracurriculars */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    <Label className="text-sm font-semibold text-[#0f172a]">Extracurriculars</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                    {extracurriculars.map((extra) => (
                        <button
                            key={extra}
                            onClick={() => toggleExtra(extra)}
                            className={`text-[12px] px-3.5 py-1.5 rounded-full font-medium transition-all duration-200 ${selectedExtras.includes(extra)
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                }`}
                        >
                            {extra}
                        </button>
                    ))}
                </div>
            </div>

            {/* Religious Affiliation */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <Label className="text-sm font-semibold text-[#0f172a]">Religious Affiliation</Label>
                </div>
                <div className="relative">
                    <select
                        className="w-full h-10 px-3 pr-8 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 appearance-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                        <option value="">Any</option>
                        <option value="christian">Christian</option>
                        <option value="islamic">Islamic</option>
                        <option value="hindu">Hindu</option>
                        <option value="secular">Secular</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Minimum Rating */}
            <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#0f172a]">Minimum Rating</Label>
                <div className="flex gap-2">
                    {[4, 3, 2, 1].map((rating) => (
                        <button
                            key={rating}
                            onClick={() => onFilterChange({
                                minRating: filters.minRating === String(rating) ? '' : String(rating)
                            })}
                            className={`flex-1 h-9 text-xs font-medium rounded-lg transition-all duration-200 ${filters.minRating === String(rating)
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {rating}+★
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Filters */}
            <div className="hidden lg:block">
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                        <h3 className="text-base font-bold text-[#0f172a]">Filters</h3>
                        <button
                            onClick={clearFilters}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            Reset All
                        </button>
                    </div>
                    <FilterContent />
                </div>
            </div>

            {/* Mobile Filters */}
            <div className="lg:hidden">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full h-11 bg-white border-gray-200 text-sm font-medium rounded-xl gap-2 shadow-sm"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Filters & Sort
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[calc(100%-32px)] max-w-md mx-auto rounded-2xl p-6 bg-white max-h-[85vh] overflow-y-auto">
                        <DialogHeader className="text-left mb-4">
                            <DialogTitle className="text-xl font-bold text-[#0f172a]">Filter Schools</DialogTitle>
                            <DialogDescription className="text-sm text-gray-400">
                                Refine your search to find the perfect school
                            </DialogDescription>
                        </DialogHeader>
                        <FilterContent />
                        <Button
                            onClick={() => setIsOpen(false)}
                            className="w-full mt-4 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                        >
                            Apply Filters
                        </Button>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

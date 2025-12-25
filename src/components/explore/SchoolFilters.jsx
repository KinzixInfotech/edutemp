'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function SchoolFilters({ filters, onFilterChange }) {
    const [isOpen, setIsOpen] = useState(false);

    const handleFeeChange = (values) => {
        onFilterChange({
            minFee: values[0] * 1000,
            maxFee: values[1] * 1000,
        });
    };

    const handleRatingChange = (value) => {
        onFilterChange({ minRating: parseFloat(value) });
    };

    const handleSortChange = (value) => {
        onFilterChange({ sort: value });
    };

    const clearFilters = () => {
        onFilterChange({
            search: '',
            location: '',
            minFee: undefined,
            maxFee: undefined,
            minRating: undefined,
            sort: 'name',
        });
    };

    const FilterContent = () => (
        <div className="space-y-5">
            {/* Search */}
            <div className="space-y-2">
                <Label className="text-sm font-medium">Search Schools</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="School name or location..."
                        value={filters.search || ''}
                        onChange={(e) => onFilterChange({ search: e.target.value })}
                        className="pl-10 h-11"
                    />
                </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
                <Label className="text-sm font-medium">Location</Label>
                <Input
                    placeholder="Enter city or area..."
                    value={filters.location || ''}
                    onChange={(e) => onFilterChange({ location: e.target.value })}
                    className="h-11"
                />
            </div>

            {/* Fee Range */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Fee Range (Annual)</Label>
                    <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                        ₹{((filters.minFee || 0) / 1000).toFixed(0)}K - ₹{((filters.maxFee || 500000) / 1000).toFixed(0)}K
                    </span>
                </div>
                <Slider
                    min={0}
                    max={500}
                    step={10}
                    value={[(filters.minFee || 0) / 1000, (filters.maxFee || 500000) / 1000]}
                    onValueChange={handleFeeChange}
                    className="w-full"
                />
            </div>

            {/* Rating and Sort - Side by side */}
            <div className="grid grid-cols-2 gap-4">
                {/* Minimum Rating */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Min Rating</Label>
                    <Select
                        value={filters.minRating?.toString() || '0'}
                        onValueChange={handleRatingChange}
                    >
                        <SelectTrigger className="h-11 w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">All Schools</SelectItem>
                            <SelectItem value="6">6+ Stars</SelectItem>
                            <SelectItem value="7">7+ Stars</SelectItem>
                            <SelectItem value="8">8+ Stars</SelectItem>
                            <SelectItem value="9">9+ Stars</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Sort By</Label>
                    <Select value={filters.sort || 'name'} onValueChange={handleSortChange}>
                        <SelectTrigger className="h-11 w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="name">Name (A-Z)</SelectItem>
                            <SelectItem value="rating">Highest Rated</SelectItem>
                            <SelectItem value="fees">Lowest Fees</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Clear Filters */}
            <Button variant="outline" onClick={clearFilters} className="w-full h-11">
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
            </Button>
        </div>
    );

    return (
        <>
            {/* Desktop Filters - Shown in sidebar */}
            <div className="hidden lg:block">
                <FilterContent />
            </div>

            {/* Mobile Filters - Dialog */}
            <div className="lg:hidden">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full h-12 bg-white border-gray-200 text-base font-medium">
                            <SlidersHorizontal className="h-5 w-5 mr-2" />
                            Filters & Sort
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[calc(100%-32px)] max-w-md mx-auto rounded-2xl p-6 bg-white">
                        <DialogHeader className="text-left mb-4">
                            <DialogTitle className="text-xl font-bold">Filter Schools</DialogTitle>
                            <DialogDescription className="text-sm text-gray-500">
                                Refine your search to find the perfect school
                            </DialogDescription>
                        </DialogHeader>
                        <FilterContent />
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

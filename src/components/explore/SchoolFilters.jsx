'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function SchoolFilters({ filters, onFilterChange, onSearch }) {
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
        <div className="space-y-6">
            {/* Search */}
            <div className="space-y-2">
                <Label>Search Schools</Label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="School name or location..."
                        value={filters.search || ''}
                        onChange={(e) => onFilterChange({ search: e.target.value })}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
                <Label>Location</Label>
                <Input
                    placeholder="Enter city or area..."
                    value={filters.location || ''}
                    onChange={(e) => onFilterChange({ location: e.target.value })}
                />
            </div>

            {/* Fee Range */}
            <div className="space-y-3">
                <div className="flex justify-between">
                    <Label>Fee Range (Annual)</Label>
                    <span className="text-sm text-muted-foreground">
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

            {/* Minimum Rating */}
            <div className="space-y-2">
                <Label>Minimum Rating</Label>
                <Select
                    value={filters.minRating?.toString() || '0'}
                    onValueChange={handleRatingChange}
                >
                    <SelectTrigger>
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
                <Label>Sort By</Label>
                <Select value={filters.sort || 'name'} onValueChange={handleSortChange}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name">Name (A-Z)</SelectItem>
                        <SelectItem value="rating">Highest Rated</SelectItem>
                        <SelectItem value="fees">Lowest Fees</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Clear Filters */}
            <Button variant="outline" onClick={clearFilters} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
            </Button>
        </div>
    );

    return (
        <>
            {/* Desktop Filters */}
            <div className="hidden lg:block">
                <FilterContent />
            </div>

            {/* Mobile Filters Sheet */}
            <div className="lg:hidden">
                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <SlidersHorizontal className="h-4 w-4 mr-2" />
                            Filters & Sort
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>Filter Schools</SheetTitle>
                            <SheetDescription>
                                Refine your search to find the perfect school
                            </SheetDescription>
                        </SheetHeader>
                        <div className="mt-6">
                            <FilterContent />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}

'use client';

import Link from 'next/link';
import { MapPin, Star, Heart, School } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SchoolCard({ school }) {
    const name = school.school?.name || school.name || 'Unknown School';
    const location = school.school?.location || school.location || '';
    const coverImage = school.coverImage;
    const profilePicture = school.profilePicture || school.school?.profilePicture;
    const rating = school.overallRating || 0;
    const minFee = school.minFee;
    const maxFee = school.maxFee;
    const slug = school.slug || school.schoolId || school.id;
    const description = school.description || school.tagline || '';
    const badges = school.badges || [];
    const classes = school.school?.classes || [];

    // Auto-calculate grade range from classes
    const getGradeRange = () => {
        if (!classes.length) return null;
        const gradeNumbers = classes
            .map(c => {
                const match = c.className.match(/(\d+)/);
                return match ? parseInt(match[1]) : null;
            })
            .filter(n => n !== null)
            .sort((a, b) => a - b);

        if (gradeNumbers.length === 0) {
            // No numeric grades found, check for names like "Nursery", "KG", "UKG" etc.
            const hasPreSchool = classes.some(c => /nursery|lkg|ukg|kg|pre/i.test(c.className));
            if (hasPreSchool && classes.length <= 3) return 'Pre-School';
            return `${classes.length} Classes`;
        }

        const min = gradeNumbers[0];
        const max = gradeNumbers[gradeNumbers.length - 1];
        const hasPreSchool = classes.some(c => /nursery|lkg|ukg|kg|pre/i.test(c.className));

        if (hasPreSchool) {
            return `Pre-K to Grade ${max}`;
        }
        return min === max ? `Grade ${min}` : `Grades ${min}-${max}`;
    };

    const gradeRange = getGradeRange();

    const formatFee = (fee) => {
        if (!fee) return null;
        if (fee >= 100000) return `₹${(fee / 100000).toFixed(1)}L`;
        return `₹${(fee / 1000).toFixed(0)}K`;
    };

    // Build dynamic tags
    const dynamicTags = [];
    if (gradeRange) dynamicTags.push(gradeRange);
    // Add badge types as tags
    badges.forEach(b => {
        const label = typeof b === 'string' ? b : b.badgeType;
        if (label && dynamicTags.length < 3) dynamicTags.push(label);
    });

    return (
        <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col">
            {/* Cover Image */}
            <div className="relative h-[200px] overflow-hidden bg-gray-100">
                {coverImage ? (
                    <img
                        src={coverImage}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : profilePicture ? (
                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
                        <img src={profilePicture} alt={name} className="w-16 h-16 rounded-xl object-cover" />
                    </div>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
                        <School className="w-12 h-12 text-gray-300" />
                    </div>
                )}

                {/* Heart icon — top left */}
                <button
                    onClick={(e) => e.preventDefault()}
                    className="absolute top-3 left-3 w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shadow-md hover:bg-blue-600 transition-colors"
                >
                    <Heart className="w-4 h-4 text-white" />
                </button>

                {/* Rating badge — top right */}
                {rating > 0 && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-[#0f172a]">{rating.toFixed(1)}</span>
                    </div>
                )}

                {/* Featured badge — bottom right */}
                {school.isFeatured && (
                    <div className="absolute bottom-3 right-3 px-3 py-1 rounded-md bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                        Best Value
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1 space-y-2.5">
                {/* Name */}
                <h3 className="font-bold text-base text-[#0f172a] line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                    <span className="line-clamp-2">{name}</span>
                    {school.isVerified && (
                        <img src="/bluetick.png" alt="Verified" className="w-[18px] h-[18px] shrink-0" />
                    )}
                </h3>

                {/* Location */}
                {location && (
                    <p className="text-[13px] text-gray-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                        <span className="truncate">{location.split(',').slice(0, 2).join(',').trim()}</span>
                    </p>
                )}

                {/* Tags — dynamic */}
                {dynamicTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {dynamicTags.map((tag, idx) => (
                            <span key={idx} className="text-[11px] bg-[#f7f9fc] font-bold px-2.5 py-1 rounded-full border border-gray-200 text-[#2d3c52] ">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Description */}
                {description && (
                    <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed">{description}</p>
                )}

                {/* Spacer to push buttons to bottom */}
                <div className="flex-1" />

                {/* Action Buttons */}
                <div className="flex gap-2.5 pt-3">
                    <Link href={`/explore/schools/${slug}`} className="flex-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-[13px] font-semibold rounded-lg h-10 border-gray-200 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-colors"
                        >
                            Compare
                        </Button>
                    </Link>
                    <Link href={`/explore/schools/${slug}`} className="flex-1">
                        <Button
                            size="sm"
                            className="w-full text-[13px] font-semibold rounded-lg h-10 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        >
                            View Profile
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

'use client';

import Link from 'next/link';
import { MapPin, Star, Heart, School, Users, BookOpen, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

function ImageWithFallback({ src, alt, className, fallbackContent }) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return fallbackContent;
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setFailed(true)}
        />
    );
}

export default function SchoolCard({ school }) {
    const name = school.school?.name || school.name || 'Unknown School';
    const rawLocation = school.school?.location || school.location || '';
    const city = school.school?.city || '';
    const state = school.school?.state || '';

    // Build a clean location string: prefer city+state, fall back to raw location
    const locationDisplay = (() => {
        if (city && state) return `${city}, ${state}`;
        if (city) return city;
        if (rawLocation) return rawLocation.split(',').slice(0, 2).join(',').trim();
        return '';
    })();

    const coverImage = school.coverImage;
    const logoImage = school.logoImage;
    const profilePicture = school.school?.profilePicture;
    const rating = school.overallRating || 0;
    const ratingCount = school._count?.ratings || 0;
    const minFee = school.minFee;
    const maxFee = school.maxFee;
    const slug = school.slug || school.schoolId || school.id;
    const description = school.description || school.tagline || '';
    const badges = school.badges || [];
    const boards = school.boards || [];
    const classes = school.school?.classes || [];
    const facilities = school.facilities || [];
    const genderType = school.genderType;

    // Grade range from classes
    const getGradeRange = () => {
        if (!classes.length) return null;
        const gradeNumbers = classes
            .map(c => { const m = c.className.match(/(\d+)/); return m ? parseInt(m[1]) : null; })
            .filter(n => n !== null)
            .sort((a, b) => a - b);

        const hasPreSchool = classes.some(c => /nursery|lkg|ukg|kg|pre/i.test(c.className));

        if (gradeNumbers.length === 0) {
            if (hasPreSchool) return 'Pre-School';
            return null;
        }
        const min = gradeNumbers[0];
        const max = gradeNumbers[gradeNumbers.length - 1];
        if (hasPreSchool) return `Pre-K – Gr ${max}`;
        return min === max ? `Grade ${min}` : `Gr ${min}–${max}`;
    };

    const gradeRange = getGradeRange();

    const formatFee = (fee) => {
        if (!fee) return null;
        if (fee >= 100000) return `₹${(fee / 100000).toFixed(1)}L`;
        return `₹${(fee / 1000).toFixed(0)}K`;
    };

    const feeDisplay = (() => {
        if (minFee && maxFee) return `${formatFee(minFee)} – ${formatFee(maxFee)}/yr`;
        if (minFee) return `From ${formatFee(minFee)}/yr`;
        if (maxFee) return `Up to ${formatFee(maxFee)}/yr`;
        return null;
    })();

    // Top tags: boards first, then grade range, then gender
    const tags = [
        ...boards.slice(0, 2),
        ...(gradeRange ? [gradeRange] : []),
        ...(genderType ? [genderType] : []),
    ].slice(0, 3);

    // Fallback cover: gradient + logo/icon
    const FallbackCover = (
        <div className="w-full h-full bg-gradient-to-br from-blue-50 via-slate-100 to-indigo-50 flex flex-col items-center justify-center gap-2">
            {(logoImage || profilePicture) ? (
                <ImageWithFallback
                    src={logoImage || profilePicture}
                    alt={name}
                    className="w-16 h-16 rounded-xl object-contain"
                    fallbackContent={
                        <div className="w-16 h-16 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
                            <School className="w-8 h-8 text-blue-300" />
                        </div>
                    }
                />
            ) : (
                <div className="w-16 h-16 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
                    <School className="w-8 h-8 text-blue-300" />
                </div>
            )}
            <span className="text-[10px] font-semibold text-gray-400 px-3 text-center line-clamp-1">{name}</span>
        </div>
    );

    return (
        <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.14)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col">
            {/* Cover */}
            <div className="relative h-[190px] overflow-hidden bg-gray-50">
                <ImageWithFallback
                    src={coverImage}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    fallbackContent={FallbackCover}
                />

                {/* Wishlist */}
                <button
                    onClick={(e) => e.preventDefault()}
                    className="absolute top-3 left-3 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow hover:bg-blue-600 transition-colors z-10"
                >
                    <Heart className="w-3.5 h-3.5 text-white" />
                </button>

                {/* Rating */}
                {rating > 0 && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm z-10">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-[12px] font-bold text-[#0f172a]">{rating.toFixed(1)}</span>
                        {ratingCount > 0 && (
                            <span className="text-[10px] text-gray-400">({ratingCount})</span>
                        )}
                    </div>
                )}

                {/* Featured */}
                {school.isFeatured && (
                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider shadow z-10">
                        Featured
                    </div>
                )}

                {/* Verified overlay on logo */}
                {school.isVerified && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm z-10">
                        <Award className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] font-semibold text-blue-600">Verified</span>
                    </div>
                )}
            </div>

            {/* Body */}
            <Link href={`/explore/schools/${slug}`} >
                <div className="p-4 flex flex-col flex-1 gap-2">
                    {/* Name */}
                    <h3 className="font-bold text-[14px] text-[#0f172a] line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                        {name}
                    </h3>

                    {/* Location */}
                    {locationDisplay && (
                        <p className="text-[12px] text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0 text-blue-400" />
                            <span className="truncate">{locationDisplay}</span>
                        </p>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {tags.map((tag, i) => (
                                <span key={i} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Description */}
                    {description && (
                        <p className="text-[12px] text-gray-400 line-clamp-2 leading-relaxed">{description}</p>
                    )}

                    {/* Fee + Students row */}
                    <div className="flex items-center gap-3 mt-auto pt-1">
                        {feeDisplay && (
                            <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                {feeDisplay}
                            </span>
                        )}
                        {school.totalStudents > 0 && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-1 ml-auto">
                                <Users className="w-3 h-3" />
                                {school.totalStudents.toLocaleString()} students
                            </span>
                        )}
                    </div>

                    {/* Facilities pills — top 3 */}
                    {facilities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {facilities.slice(0, 3).map((f, i) => (
                                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
                                    {f.name}
                                </span>
                            ))}
                            {facilities.length > 3 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-100">
                                    +{facilities.length - 3} more
                                </span>
                            )}
                        </div>
                    )}

                </div>
            </Link>
        </div>
    );
}

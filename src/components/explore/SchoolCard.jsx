'use client';

import Link from 'next/link';
import { MapPin, Users, Star, TrendingUp, BadgeCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SchoolCard({ school }) {
    const {
        id,
        tagline,
        minFee,
        maxFee,
        totalStudents,
        totalTeachers,
        studentTeacherRatio,
        overallRating,
        isVerified,
        isFeatured,
        school: schoolData,
        badges,
        _count,
    } = school;

    const formatFee = (fee) => {
        if (!fee) return 'N/A';
        if (fee >= 100000) return `₹${(fee / 100000).toFixed(1)}L`;
        return `₹${(fee / 1000).toFixed(0)}K`;
    };

    return (
        <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
            {/* Header */}
            <div className="p-6 space-y-4">
                {/* School Logo & Name */}
                <div className="flex items-start gap-4">
                    {schoolData?.profilePicture && (
                        <img
                            src={schoolData.profilePicture}
                            alt={schoolData.name}
                            className="w-16 h-16 rounded-lg object-cover
 border"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                            <h3 className="text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                                {schoolData?.name}
                            </h3>
                            {isVerified && (
                                <BadgeCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            )}
                        </div>
                        {tagline && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{tagline}</p>
                        )}
                    </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">{schoolData?.location}</span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    {/* Fee Range */}
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-xs">
                            <div className="text-muted-foreground">Fees</div>
                            <div className="font-semibold">
                                {formatFee(minFee)} - {formatFee(maxFee)}
                            </div>
                        </div>
                    </div>


                    {/* Rating */}
                    {overallRating > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400 fill-current" />
                            </div>
                            <div className="text-xs">
                                <div className="text-muted-foreground">Rating</div>
                                <div className="font-semibold">{overallRating.toFixed(1)}/10</div>
                            </div>
                        </div>
                    )}

                    {/* Teacher Ratio */}
                    {studentTeacherRatio && (
                        <div className="flex items-center gap-2 col-span-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="text-xs">
                                <div className="text-muted-foreground">Student-Teacher Ratio</div>
                                <div className="font-semibold">1:{Math.round(studentTeacherRatio)}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Badges */}
                {badges && badges.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t">
                        {badges.slice(0, 2).map((badge, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                                {badge.badgeType}
                            </Badge>
                        ))}
                        {badges.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                                +{badges.length - 2} more
                            </Badge>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3">
                    <Link href={`/explore/schools/${id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                            View Profile
                        </Button>
                    </Link>
                    <Link href={`/explore/schools/${id}#apply`} className="flex-1">
                        <Button className="w-full">
                            Apply Now
                        </Button>
                    </Link>
                </div>

                {/* Featured Badge */}
                {isFeatured && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-bl-lg">
                        FEATURED
                    </div>
                )}
            </div>
        </Card>
    );
}

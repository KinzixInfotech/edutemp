'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReviewSection from '@/components/explore/ReviewSection';
import ReviewGate from '@/components/explore/ReviewGate';
import {
    MapPin, Phone, Mail, Globe, DollarSign, Users, GraduationCap,
    Star, Award, Trophy, Image as ImageIcon, ArrowLeft, CheckCircle2,
    Calendar, BookOpen
} from 'lucide-react';
import Link from 'next/link';

export default function SchoolProfileClient({ schoolId }) {
    const [reviewPage, setReviewPage] = useState(1);

    const { data: school, isLoading, isError } = useQuery({
        queryKey: ['school-profile', schoolId],
        queryFn: async () => {
            const response = await fetch(`/api/public/schools/${schoolId}`);
            if (!response.ok) throw new Error('School not found');
            return response.json();
        },
        staleTime: 10 * 60 * 1000,
    });

    // Alias the refetch function to schoolRefetch
    const { refetch: schoolRefetch } = useQuery({
        queryKey: ['school-profile', schoolId],
        enabled: false // This hook is just to get the refetch function if needed, but cleaner to destructure from original
    });

    const { data: reviewsData, isLoading: reviewsLoading, refetch: refetchReviews } = useQuery({
        queryKey: ['school-reviews', schoolId, reviewPage],
        queryFn: async () => {
            const response = await fetch(`/api/public/schools/${schoolId}/reviews?page=${reviewPage}`);
            if (!response.ok) throw new Error('Failed to fetch reviews');
            return response.json();
        },
        enabled: !!schoolId,
    });

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                <Skeleton className="h-64 w-full rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-96 col-span-2" />
                    <Skeleton className="h-96" />
                </div>
            </div>
        );
    }

    if (isError || !school) {
        return (
            <div className="max-w-7xl mx-auto p-6">
                <Card className="p-12 text-center">
                    <h2 className="text-2xl font-bold mb-4">School Not Found</h2>
                    <p className="text-muted-foreground mb-6">
                        The school you're looking for doesn't exist or is not publicly visible.
                    </p>
                    <Link href="/explore/schools">
                        <Button>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Directory
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            {/* Back Button */}
            <Link href="/explore/schools">
                <Button variant="ghost" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Directory
                </Button>
            </Link>

            {/* Cover Image */}
            {school.coverImage && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative h-48 sm:h-56 md:h-64 rounded-lg overflow-hidden"
                >
                    <img
                        src={school.coverImage}
                        alt={school.school.name}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </motion.div>
            )}

            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
                        {school.logoImage || school.school.profilePicture ? (
                            <img
                                src={school.logoImage || school.school.profilePicture}
                                alt={school.school.name}
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover border-2 shrink-0"
                            />
                        ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                    <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">{school.school.name}</h1>
                                    <p className="text-sm sm:text-base text-muted-foreground flex items-center gap-2">
                                        <MapPin className="h-4 w-4 shrink-0" />
                                        <span className="truncate">{school.school.location}</span>
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    {school.isVerified && (
                                        <Badge variant="secondary" className="gap-1">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Verified
                                        </Badge>
                                    )}
                                    {school.isFeatured && (
                                        <Badge className="gap-1">
                                            <Trophy className="h-3 w-3" />
                                            Featured
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {school.tagline && (
                                <p className="text-sm sm:text-base md:text-lg text-muted-foreground italic mb-3 md:mb-4 line-clamp-2">"{school.tagline}"</p>
                            )}

                            {/* Rating */}
                            <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-3 md:mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5 md:gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`h-4 w-4 sm:h-5 sm:w-5 ${i < Math.floor(school.overallRating)
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'text-gray-300'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <span className="font-semibold text-sm sm:text-base">{school.overallRating.toFixed(1)}</span>
                                    <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                                        ({school._count?.ratings || 0} reviews)
                                    </span>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                                {school.establishedYear && (
                                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="whitespace-nowrap">Est. {school.establishedYear}</span>
                                    </div>
                                )}
                                {school.totalStudents && (
                                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="whitespace-nowrap">{school.totalStudents} Students</span>
                                    </div>
                                )}
                                {school.totalTeachers && (
                                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                                        <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="whitespace-nowrap">{school.totalTeachers} Teachers</span>
                                    </div>
                                )}
                                {school.studentTeacherRatio && (
                                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                                        <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="whitespace-nowrap">1:{school.studentTeacherRatio} Ratio</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 h-auto">
                    <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
                    <TabsTrigger value="achievements" className="text-xs md:text-sm">
                        Achievements ({school._count?.achievements || 0})
                    </TabsTrigger>
                    <TabsTrigger value="facilities" className="text-xs md:text-sm">
                        Facilities ({school._count?.facilities || 0})
                    </TabsTrigger>
                    <TabsTrigger value="gallery" className="text-xs md:text-sm">
                        Gallery ({school._count?.gallery || 0})
                    </TabsTrigger>
                    <TabsTrigger value="reviews" className="text-xs md:text-sm">
                        Reviews ({reviewsData?.total || 0})
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Description */}
                            {school.description && (
                                <Card className="p-6">
                                    <h2 className="text-xl font-semibold mb-4">About</h2>
                                    <p className="text-muted-foreground whitespace-pre-line">{school.description}</p>
                                </Card>
                            )}

                            {/* Vision & Mission */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {school.vision && (
                                    <Card className="p-6">
                                        <h3 className="font-semibold mb-2">Vision</h3>
                                        <p className="text-sm text-muted-foreground">{school.vision}</p>
                                    </Card>
                                )}
                                {school.mission && (
                                    <Card className="p-6">
                                        <h3 className="font-semibold mb-2">Mission</h3>
                                        <p className="text-sm text-muted-foreground">{school.mission}</p>
                                    </Card>
                                )}
                            </div>

                            {/* Ratings Breakdown */}
                            <Card className="p-6">
                                <h2 className="text-xl font-semibold mb-4">Ratings Breakdown</h2>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Academic Excellence</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${(school.academicRating / 5) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium w-8">{school.academicRating.toFixed(1)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Infrastructure</span>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500"
                                                    style={{ width: `${(school.infrastructureRating / 5) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium w-8">{school.infrastructureRating.toFixed(1)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Sports & Activities</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500"
                                                    style={{ width: `${(school.sportsRating / 5) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium w-8">{school.sportsRating.toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Contact Information */}
                            <Card className="p-6">
                                <h3 className="font-semibold mb-4">Contact Information</h3>
                                <div className="space-y-3">
                                    {(school.publicPhone || school.school.contactNumber) && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span>{school.publicPhone || school.school.contactNumber}</span>
                                        </div>
                                    )}
                                    {school.publicEmail && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <span className="break-all">{school.publicEmail}</span>
                                        </div>
                                    )}
                                    {school.website && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Globe className="h-4 w-4 text-muted-foreground" />
                                            <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                Visit Website
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Fee Information */}
                            {(school.minFee || school.maxFee) && (
                                <Card className="p-6">
                                    <h3 className="font-semibold mb-4">Annual Fee Range</h3>
                                    <div className="flex items-center gap-2 mb-2">
                                        <DollarSign className="h-5 w-5 text-primary" />
                                        <span className="text-2xl font-bold">
                                            ₹{school.minFee?.toLocaleString()} - ₹{school.maxFee?.toLocaleString()}
                                        </span>
                                    </div>
                                    {school.feeStructureUrl && (
                                        <a href={school.feeStructureUrl} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" size="sm" className="w-full mt-2">
                                                View Fee Structure
                                            </Button>
                                        </a>
                                    )}
                                </Card>
                            )}

                            {/* Apply Button */}
                            <Link href={`/explore/schools/${schoolId}/apply`}>
                                <Button className="w-full" size="lg">
                                    Apply for Admission
                                </Button>
                            </Link>
                        </div>
                    </div>
                </TabsContent>

                {/* Achievements Tab */}
                <TabsContent value="achievements">
                    {school.achievements && school.achievements.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {school.achievements.map((achievement) => (
                                <Card key={achievement.id} className="p-6">
                                    <div className="flex items-start gap-4">
                                        <Award className="h-8 w-8 text-yellow-500 shrink-0" />
                                        <div>
                                            <h3 className="font-semibold mb-1">{achievement.title}</h3>
                                            {achievement.description && (
                                                <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                                            )}
                                            {achievement.year && (
                                                <span className="text-xs text-muted-foreground">Year: {achievement.year}</span>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-12 text-center">
                            <p className="text-muted-foreground">No achievements listed yet.</p>
                        </Card>
                    )}
                </TabsContent>

                {/* Facilities Tab */}
                <TabsContent value="facilities">
                    {school.facilities && school.facilities.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {school.facilities.map((facility) => (
                                <Card key={facility.id} className="p-4 flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    <span className="font-medium">{facility.name}</span>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-12 text-center">
                            <p className="text-muted-foreground">No facilities listed yet.</p>
                        </Card>
                    )}
                </TabsContent>

                {/* Gallery Tab */}
                <TabsContent value="gallery">
                    {school.gallery && school.gallery.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {school.gallery.map((item) => (
                                <Card key={item.id} className="overflow-hidden group cursor-pointer">
                                    <img
                                        src={item.imageUrl}
                                        alt={item.caption || 'Gallery image'}
                                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform"
                                    />
                                    {item.caption && (
                                        <div className="p-3">
                                            <p className="text-sm text-muted-foreground">{item.caption}</p>
                                        </div>
                                    )}
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-12 text-center">
                            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground">No gallery images yet.</p>
                        </Card>
                    )}
                </TabsContent>
                {/* Reviews Tab */}
                <TabsContent value="reviews">
                    <div className="space-y-6">
                        {/* Review Stats */}
                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">Parent Reviews</h3>
                                    <p className="text-muted-foreground">
                                        {reviewsData?.total || 0} verified parent {reviewsData?.total === 1 ? 'review' : 'reviews'}
                                    </p>
                                </div>
                                <ReviewGate
                                    profileId={schoolId}
                                    schoolId={school?.school?.id}
                                    onReviewSubmit={() => {
                                        refetchReviews();
                                        schoolRefetch();
                                    }}
                                />
                            </div>
                        </Card>

                        {/* Reviews List */}
                        {reviewsLoading ? (
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-32 w-full" />
                                ))}
                            </div>
                        ) : (
                            <ReviewSection
                                reviews={reviewsData?.reviews}
                                totalPages={reviewsData?.totalPages}
                                currentPage={reviewPage}
                                onPageChange={setReviewPage}
                            />
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

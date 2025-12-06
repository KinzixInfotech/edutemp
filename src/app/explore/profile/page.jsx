'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    User,
    Mail,
    Phone,
    MapPin,
    School,
    Users,
    LogOut,
    ArrowLeft,
    Edit
} from 'lucide-react';
import Link from 'next/link';

export default function ParentProfilePage() {
    const router = useRouter();
    const [parentData, setParentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accessToken, setAccessToken] = useState(null);

    useEffect(() => {
        const loadParentData = async () => {
            if (typeof window !== 'undefined') {
                const storedData = localStorage.getItem('parentUser');
                if (storedData) {
                    setParentData(JSON.parse(storedData));
                    // Get access token for reviews query
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL,
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                    );
                    const { data: session } = await supabase.auth.getSession();
                    if (session?.session?.access_token) {
                        setAccessToken(session.session.access_token);
                    }
                } else {
                    router.push('/explore/login?returnTo=/explore/profile');
                }
                setLoading(false);
            }
        };

        loadParentData();
    }, [router]);

    // TanStack Query for reviews with caching
    const { data: reviewsData, isLoading: loadingReviews } = useQuery({
        queryKey: ['parent-reviews', accessToken],
        queryFn: async () => {
            const res = await fetch('/api/parents/reviews', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            if (!res.ok) throw new Error('Failed to fetch reviews');
            return res.json();
        },
        enabled: !!accessToken, // Only run when token is available
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    });

    const myReviews = reviewsData?.reviews || [];

    const handleLogout = async () => {
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );

            await supabase.auth.signOut();

            if (typeof window !== 'undefined') {
                localStorage.removeItem('parentUser');
            }

            router.push('/explore');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!parentData) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
                {/* Back Button */}
                <Link href="/explore">
                    <Button variant="ghost" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Explorer
                    </Button>
                </Link>

                {/* Profile Header */}
                <Card className="p-6 md:p-8">
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                        {/* Avatar */}
                        <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                            <AvatarImage src={parentData.profilePicture} />
                            <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                                {parentData.name?.charAt(0).toUpperCase() || 'P'}
                            </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 space-y-3">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold mb-1">{parentData.name}</h1>
                                <p className="text-muted-foreground">{parentData.email}</p>
                            </div>

                            <Badge variant="secondary" className="gap-1">
                                <User className="h-3 w-3" />
                                Parent
                            </Badge>

                            <div className="flex flex-wrap gap-2 pt-2">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Edit className="h-4 w-4" />
                                    Edit Profile
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* School Information */}
                    {parentData.parent?.school && (
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <School className="h-5 w-5 text-primary" />
                                School Information
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-muted-foreground">School Name</p>
                                    <p className="font-medium">{parentData.parent.school.name}</p>
                                </div>
                                {parentData.parent.school.location && (
                                    <div>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            Location
                                        </p>
                                        <p className="font-medium">{parentData.parent.school.location}</p>
                                    </div>
                                )}
                            </div>
                            <Link href={`/explore/schools/${parentData.parent.school.publicProfile?.id || parentData.parent.schoolId}`}>
                                <Button variant="outline" size="sm" className="w-full mt-2">
                                    View Public Profile
                                </Button>
                            </Link>
                        </Card>
                    )}

                    {/* Children Information */}
                    {parentData.parent?.students && parentData.parent.students.length > 0 && (
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Children ({parentData.parent.students.length})
                            </h2>
                            <div className="space-y-3">
                                {parentData.parent.students.map((student, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                {student.name?.charAt(0).toUpperCase() || 'S'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{student.name}</p>
                                            {student.class && (
                                                <p className="text-sm text-muted-foreground">
                                                    Class: {student.class.name || student.class.className}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Contact Information */}
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Mail className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium truncate">{parentData.email}</p>
                            </div>
                        </div>
                        {parentData.phone && (
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Phone className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Phone</p>
                                    <p className="font-medium">{parentData.phone}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Recent Activity */}
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">My Reviews</h2>

                    {loadingReviews ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    ) : myReviews.length > 0 ? (
                        <div className="space-y-4">
                            {myReviews.map((review) => (
                                <div key={review.id} className="p-4 rounded-lg bg-muted/30 border border-border/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-border">
                                                <AvatarImage src={review.profile?.school?.profilePicture} />
                                                <AvatarFallback><School className="h-4 w-4" /></AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="font-semibold text-sm">{review.profile?.school?.name || 'Unknown School'}</h3>
                                                <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <Badge variant={review.overallRating >= 4 ? "default" : "secondary"}>
                                            {review.overallRating}/5
                                        </Badge>
                                    </div>

                                    <p className="text-sm text-foreground/90 italic">"{review.review || 'No written review'}"</p>

                                    <div className="flex gap-4 mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                                        <span>Academic: <b>{review.academicRating}</b></span>
                                        <span>Infrastructure: <b>{review.infrastructureRating}</b></span>
                                        <span>Teacher: <b>{review.teacherRating}</b></span>
                                    </div>

                                    <Link href={`/explore/schools/${review.profile?.school?.publicProfile?.id}`}>
                                        <Button variant="link" size="sm" className="px-0 mt-2 h-auto text-primary">
                                            View School Profile &rarr;
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            You haven't submitted any reviews yet.
                        </p>
                    )}
                </Card>
            </div>
        </div >
    );
}

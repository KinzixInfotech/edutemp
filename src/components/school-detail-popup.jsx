
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Globe, MapPin, Mail, Phone, School, ExternalLink, Calendar, CheckCircle2, Languages } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

export function SchoolDetailPopup({ school, children }) {
    // Fetch explorer profile for cover image
    const { data: explorerProfile } = useQuery({
        queryKey: ['school-explorer-profile-popup', school?.id],
        queryFn: async () => {
            const response = await fetch(`/api/schools/${school.id}/explorer/profile`);
            if (!response.ok) return null;
            return response.json();
        },
        enabled: !!school?.id,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    if (!school) return children

    // Get cover image from explorer profile media
    const coverImageUrl = explorerProfile?.coverImage;

    const createdDate = school.createdAt ? new Date(school.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : null;

    const updatedDate = school.updatedAt ? new Date(school.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }) : null;

    return (
        <Dialog >
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="sm:max-w-[425px] p-0 overflow-hidden border-0 shadow-2xl">
                {/* Header Banner */}
                <div
                    className="relative w-full h-32 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 dark:from-blue-800 dark:via-blue-700 dark:to-indigo-800"
                    style={coverImageUrl ? {
                        backgroundImage: `url(${coverImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    } : undefined}
                >
                    {/* Overlay for better depth / image readability */}
                    <div className={`absolute inset-0 ${coverImageUrl ? 'bg-black/30' : 'bg-gradient-to-t from-black/20 to-transparent'}`} />
                    {/* Decorative elements - only show when using gradient (no cover image) */}
                    {!coverImageUrl && (
                        <>
                            {/* Decorative patterns - grid dots */}
                            <div
                                className="absolute inset-0 opacity-20"
                                style={{
                                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
                                    backgroundSize: '16px 16px'
                                }}
                            />

                            {/* Decorative circles */}
                            <div className="absolute top-4 right-8 w-20 h-20 border-2 border-white/20 rounded-full" />
                            <div className="absolute top-8 right-4 w-12 h-12 border border-white/15 rounded-full" />
                            <div className="absolute bottom-4 left-6 w-16 h-16 border border-white/10 rounded-full" />
                            {/* Glow effects */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                        </>
                    )}
                </div>

                <div className="px-6 pb-6 relative">
                    {/* Profile Image - Overlapping Header */}
                    <div className="relative -mt-14 mb-4 flex justify-between items-end">
                        <div className="p-1 bg-background rounded-xl shadow-xl ring-2 ring-white/50 dark:ring-white/20">
                            <Avatar className="h-20 w-20 rounded-lg">
                                <AvatarImage
                                    src={school.profilePicture}
                                    alt={school.name}
                                    className="object-cover rounded-lg"
                                />
                                <AvatarFallback className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xl font-bold rounded-lg">
                                    {school.name?.substring(0, 2).toUpperCase() || "SC"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        {school.schoolCode && (
                            <Badge variant="outline" className="mb-2 bg-background/80 backdrop-blur border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-mono shadow-sm">
                                #{school.schoolCode}
                            </Badge>
                        )}
                    </div>

                    <div className="space-y-1 mb-6">
                        <DialogTitle className="text-2xl font-bold leading-tight tracking-tight">
                            {school.name}
                        </DialogTitle>
                        {school.id && (
                            <p className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                {school.id}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-3 relative z-10">
                        {/* Status/Info Cards */}
                        <div className="grid grid-cols-2 gap-3">
                            {createdDate && (
                                <div className="flex flex-col p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-border/40">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="h-3.5 w-3.5 text-primary/70" />
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Joined On</span>
                                    </div>
                                    <p className="text-sm font-medium">{createdDate}</p>
                                </div>
                            )}

                            {school.Language && (
                                <div className="flex flex-col p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-border/40">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Languages className="h-3.5 w-3.5 text-primary/70" />
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Language</span>
                                    </div>
                                    <p className="text-sm font-medium">{school.Language}</p>
                                </div>
                            )}
                        </div>

                        {/* Contact Info */}
                        {(school.contactNumber || school.location) && (
                            <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-3">
                                {school.contactNumber && (
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                            <Phone className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase">Contact Number</p>
                                            <p className="text-sm font-medium">{school.contactNumber}</p>
                                        </div>
                                    </div>
                                )}
                                {school.contactNumber && school.location && <Separator className="bg-border/50" />}
                                {school.location && (
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                                            <MapPin className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-medium text-muted-foreground uppercase">Location</p>
                                            <p className="text-sm font-medium truncate text-pretty">{school.location}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* View Profile Action */}
                        <Button className="w-full h-11 shadow-lg shadow-primary/20 mt-2 hover:translate-y-[-1px] transition-transform" asChild>
                            <a
                                href={`https://school.edubreezy.com/explore/schools/${school.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 font-semibold"
                            >
                                View Public Profile
                                <ExternalLink className="h-4 w-4 opacity-70" />
                            </a>
                        </Button>
                        <p className="text-[10px] text-center text-muted-foreground mt-1">
                            Last updated: {updatedDate}
                        </p>
                    </div>
                </div>

                <DialogDescription className="sr-only">
                    Details for {school.name}
                </DialogDescription>
            </DialogContent>
        </Dialog>
    )
}

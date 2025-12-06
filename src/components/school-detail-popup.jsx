
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

export function SchoolDetailPopup({ school, children }) {
    if (!school) return children
    console.log(school)
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
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-0 shadow-2xl">
                {/* Header Banner */}
                <div className="relative w-full h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900">
                    <div className="absolute inset-0 bg-black/10 dark:bg-black/30" />
                    {/* Abstract decorative circles */}
                    <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl" />
                    <div className="absolute bottom-[-10px] left-[-10px] w-16 h-16 bg-white/10 rounded-full blur-lg" />
                </div>

                <div className="px-6 pb-6 relative">
                    {/* Profile Image - Overlapping Header */}
                    <div className="relative -mt-16 mb-4 flex justify-between items-end">
                        <div className="p-1.5 bg-background rounded-2xl shadow-xl ring-2 ring-background/50">
                            <Avatar className="h-24 w-24 rounded-xl border border-border/20">
                                <AvatarImage src={school.profilePicture} alt={school.name} className="object-cover" />
                                <AvatarFallback className="bg-primary/5 text-primary text-2xl font-bold rounded-xl">
                                    {school.name?.substring(0, 2).toUpperCase() || "SC"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        {school.schoolCode && (
                            <Badge variant="outline" className="mb-2 bg-background/80 backdrop-blur border-primary/20 text-primary font-mono shadow-sm">
                                #{school.schoolCode}
                            </Badge>
                        )}
                    </div>

                    <div className="space-y-1 mb-6">
                        <DialogTitle className="text-2xl font-bold leading-tight tracking-tight">
                            {school.name}
                        </DialogTitle>
                        {school.domain && (
                            <p className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                {school.domain}
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
                                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">With us since</span>
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

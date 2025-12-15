"use client"

import { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    Bell,
    BookOpen,
    Bus,
    RefreshCw,
    ChevronRight,
    Clock,
    User,
    Loader2
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function RequestsDropdown({ schoolId }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [open, setOpen] = useState(false)

    // Fetch library book requests
    const { data: libraryData, isLoading: libraryLoading, refetch: refetchLibrary } = useQuery({
        queryKey: ['library-requests-count', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/library/requests?status=PENDING&limit=5`)
            if (!res.ok) throw new Error('Failed to fetch')
            return res.json()
        },
        enabled: !!schoolId && open,
        staleTime: 1000 * 30,
    })

    // Fetch bus requests
    const { data: busData, isLoading: busLoading, refetch: refetchBus } = useQuery({
        queryKey: ['bus-requests-count', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/transport/requests?schoolId=${schoolId}&status=PENDING&limit=5`)
            if (!res.ok) throw new Error('Failed to fetch')
            return res.json()
        },
        enabled: !!schoolId && open,
        staleTime: 1000 * 30,
    })

    // Fetch counts for badge (lightweight call)
    const { data: countsData, refetch: refetchCounts } = useQuery({
        queryKey: ['requests-counts', schoolId],
        queryFn: async () => {
            const [libraryRes, busRes] = await Promise.all([
                fetch(`/api/schools/${schoolId}/library/requests?status=PENDING&limit=1`),
                fetch(`/api/schools/transport/requests?schoolId=${schoolId}&status=PENDING&limit=1`),
            ])
            const libraryData = libraryRes.ok ? await libraryRes.json() : { total: 0 }
            const busData = busRes.ok ? await busRes.json() : { total: 0 }
            return {
                library: libraryData.total || libraryData.requests?.length || 0,
                bus: busData.total || busData.requests?.length || 0,
            }
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60,
        refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
    })

    const libraryRequests = libraryData?.requests || []
    const busRequests = busData?.requests || []
    const totalCount = (countsData?.library || 0) + (countsData?.bus || 0)
    const isLoading = libraryLoading || busLoading

    const handleRefresh = async () => {
        await Promise.all([refetchLibrary(), refetchBus(), refetchCounts()])
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return date.toLocaleDateString()
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell size={20} className="text-muted-foreground" />
                    {totalCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                            {totalCount > 99 ? '99+' : totalCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="end">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                        <Bell size={18} className="text-primary" />
                        <span className="font-semibold">Pending Requests</span>
                        {totalCount > 0 && (
                            <Badge variant="secondary" className="h-5 text-xs">
                                {totalCount}
                            </Badge>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleRefresh}
                        disabled={isLoading}
                    >
                        <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
                    </Button>
                </div>

                <ScrollArea className="max-h-[400px]">
                    {/* Library Book Requests */}
                    <div className="p-3">
                        <button
                            className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                            onClick={() => {
                                router.push('/dashboard/schools/library/requests')
                                setOpen(false)
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <BookOpen size={16} className="text-blue-500" />
                                <span>Library Book Requests</span>
                                {countsData?.library > 0 && (
                                    <Badge variant="outline" className="h-5 text-xs bg-blue-50 text-blue-600 border-blue-200">
                                        {countsData.library}
                                    </Badge>
                                )}
                            </div>
                            <ChevronRight size={14} />
                        </button>

                        {libraryLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 size={18} className="animate-spin text-muted-foreground" />
                            </div>
                        ) : libraryRequests.length > 0 ? (
                            <div className="mt-2 space-y-1">
                                {libraryRequests.slice(0, 3).map((request) => (
                                    <div
                                        key={request.id}
                                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                                        onClick={() => {
                                            router.push('/dashboard/schools/library/requests')
                                            setOpen(false)
                                        }}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <BookOpen size={14} className="text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {request.book?.title || 'Book Request'}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <User size={10} />
                                                <span className="truncate">{request.student?.name || 'Student'}</span>
                                                <span>•</span>
                                                <Clock size={10} />
                                                <span>{formatDate(request.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {countsData?.library > 3 && (
                                    <button
                                        className="w-full text-xs text-center text-primary hover:underline py-1"
                                        onClick={() => {
                                            router.push('/dashboard/schools/library/requests')
                                            setOpen(false)
                                        }}
                                    >
                                        View all {countsData.library} requests
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground text-center py-3">
                                No pending library requests
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/* Bus Requests */}
                    <div className="p-3">
                        <button
                            className="flex items-center justify-between w-full px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                            onClick={() => {
                                router.push('/dashboard/schools/transport/requests')
                                setOpen(false)
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Bus size={16} className="text-green-500" />
                                <span>Bus Service Requests</span>
                                {countsData?.bus > 0 && (
                                    <Badge variant="outline" className="h-5 text-xs bg-green-50 text-green-600 border-green-200">
                                        {countsData.bus}
                                    </Badge>
                                )}
                            </div>
                            <ChevronRight size={14} />
                        </button>

                        {busLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 size={18} className="animate-spin text-muted-foreground" />
                            </div>
                        ) : busRequests.length > 0 ? (
                            <div className="mt-2 space-y-1">
                                {busRequests.slice(0, 3).map((request) => (
                                    <div
                                        key={request.id}
                                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                                        onClick={() => {
                                            router.push('/dashboard/schools/transport/requests')
                                            setOpen(false)
                                        }}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                            <Bus size={14} className="text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {request.requestType === 'NEW' ? 'New Service' :
                                                    request.requestType === 'CHANGE_STOP' ? 'Change Stop' :
                                                        request.requestType === 'CANCEL' ? 'Cancel Service' : 'Request'}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <User size={10} />
                                                <span className="truncate">{request.student?.name || 'Student'}</span>
                                                <span>•</span>
                                                <Clock size={10} />
                                                <span>{formatDate(request.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {countsData?.bus > 3 && (
                                    <button
                                        className="w-full text-xs text-center text-primary hover:underline py-1"
                                        onClick={() => {
                                            router.push('/dashboard/schools/transport/requests')
                                            setOpen(false)
                                        }}
                                    >
                                        View all {countsData.bus} requests
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground text-center py-3">
                                No pending bus requests
                            </p>
                        )}
                    </div>
                </ScrollArea>

                {totalCount === 0 && !isLoading && (
                    <div className="px-4 py-6 text-center border-t">
                        <Bell size={24} className="mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No pending requests</p>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}

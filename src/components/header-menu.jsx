"use client"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

export function UserDropdown() {
    const router = useRouter()
    const { fullUser } = useAuth();
    return (
        <Avatar className="h-8 w-8 rounded-lg  cursor-pointer">
            <AvatarImage src={fullUser?.
                profilePicture} alt={fullUser?.name} />
            <AvatarFallback className='rounded-lg'>
                {fullUser?.email?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
        </Avatar>
    )
}

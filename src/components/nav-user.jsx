"use client"
import { useAuth } from '@/context/AuthContext';
import {
    IconCreditCard,
    IconDotsVertical,
    IconLogout,
    IconNotification,
    IconUserCircle,
    IconDevices,
} from "@tabler/icons-react"
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // a
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSettingsDialog } from "@/context/Settingsdialog-context";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({ }) {
    const { isMobile } = useSidebar()
    const router = useRouter();
    const { setOpen } = useSettingsDialog()
    const { fullUser, loading } = useAuth();
    const handleLogout = async () => {
        toast("Logging Out");

        const user = await supabase.auth.getUser();
        const userId = user.data?.user?.id;

        if (userId) {
            //  Update status via backend
            await fetch("/api/logout-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
        }

        const { error } = await supabase.auth.signOut();


        if (error) {
            toast.error("Logout error:", error.message);
            console.error("Logout error:", error.message);
        } else {
            localStorage.removeItem("user");
            toast.success("Logged Out Successfully");
            router.push('/login');
        }
    };
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8  rounded-full` ">
                                <AvatarImage src={fullUser?.
                                    profilePicture} alt={fullUser?.name} />
                                <AvatarFallback className="rounded-full">

                                    {fullUser?.email?.[0]?.toUpperCase() ?? "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{fullUser?.name || 'Add Name'}</span>
                                <span className="text-muted-foreground truncate text-xs">
                                    {fullUser?.email}
                                </span>
                            </div>
                            <IconDotsVertical className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-full">
                                    <AvatarImage src={fullUser?.profilePicture} alt={fullUser?.name} />
                                    <AvatarFallback className="rounded-full">
                                        {fullUser?.email?.[0]?.toUpperCase() ?? "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate capitalize font-medium">{fullUser?.name || 'Add Name'} </span>
                                    <span className="text-muted-foreground truncate text-xs">
                                        {fullUser?.email}
                                    </span>
                                </div>
                            </div>
                            {/* {fullUser?.role.name} */}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => setOpen(true)}>
                                <IconUserCircle />
                                Account
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/dashboard/settings/sessions')}>
                                <IconDevices />
                                Active Sessions
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <div onClick={handleLogout}>
                            <DropdownMenuItem >
                                <IconLogout />
                                Log out
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>

    )
}
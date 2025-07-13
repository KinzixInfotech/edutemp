'use client';

import {
    IconCirclePlusFilled, IconMail, IconArrowRight
} from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import Link from 'next/link';

export function NavMain({ items }) {
    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    <SidebarMenuItem className="flex items-center gap-2">
                        <SidebarMenuButton
                            tooltip="Inbox"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear items-center cursor-pointer"
                        >
                            <IconMail color='#fff' />
                            <span className=" text-white">Inbox</span>
                        </SidebarMenuButton>
                        <Button
                            size="icon"
                            className="size-8 group-data-[collapsible=icon]:opacity-0"
                            variant="outline"
                        >
                            <IconArrowRight />
                            <span className="sr-only text-white">Inbox</span>
                        </Button>
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <Link href={item.url}>
                                <SidebarMenuButton tooltip={item.title}>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

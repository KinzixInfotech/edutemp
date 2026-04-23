"use client"

import * as React from "react"
import { Moon, Sun, Check, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
    const { theme, setTheme } = useTheme()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={'ghost'} size="icon" className="bg-muted border">
                    <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={'shadow-none'}>
                <DropdownMenuItem
                    onClick={() => setTheme("light")}
                    className={theme === "light" ? "bg-accent" : ""}
                >
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                    {theme === "light" && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme("dark")}
                    className={theme === "dark" ? "bg-accent" : ""}
                >
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                    {theme === "dark" && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme("system")}
                    className={theme === "system" ? "bg-accent" : ""}
                >
                    <Monitor className="h-4 w-4 mr-2" />
                    System
                    {theme === "system" && <Check className="h-4 w-4 ml-auto" />}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

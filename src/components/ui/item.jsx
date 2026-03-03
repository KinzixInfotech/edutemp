"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// ─── Item (layout component for rich list items) ──────────────────

const itemSizes = {
    xs: "gap-1.5",
    sm: "gap-2",
    md: "gap-2.5",
    lg: "gap-3",
}

function Item({ size = "sm", className, children, ...props }) {
    return (
        <div
            data-slot="item"
            className={cn("flex items-center", itemSizes[size] || itemSizes.sm, className)}
            {...props}
        >
            {children}
        </div>
    )
}

function ItemContent({ className, children, ...props }) {
    return (
        <div
            data-slot="item-content"
            className={cn("flex flex-col min-w-0 flex-1", className)}
            {...props}
        >
            {children}
        </div>
    )
}

function ItemTitle({ className, children, ...props }) {
    return (
        <p
            data-slot="item-title"
            className={cn("text-sm font-medium truncate", className)}
            {...props}
        >
            {children}
        </p>
    )
}

function ItemDescription({ className, children, ...props }) {
    return (
        <p
            data-slot="item-description"
            className={cn("text-[10px] text-muted-foreground truncate", className)}
            {...props}
        >
            {children}
        </p>
    )
}

export {
    Item,
    ItemContent,
    ItemTitle,
    ItemDescription,
}

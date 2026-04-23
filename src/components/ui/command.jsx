"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"
import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function Command({
  className,
  ...props
}) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "bg-transparent text-popover-foreground flex h-full w-full flex-col overflow-hidden",
        className
      )}
      {...props} />
  );
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          // macOS Spotlight dimensions - wider on larger screens
          "overflow-hidden p-0 w-[95vw] sm:max-w-[640px] md:max-w-[680px] lg:max-w-[720px]",
          // White translucent background with backdrop blur
          "bg-white/90 dark:bg-zinc-900/90",
          "backdrop-blur-2xl backdrop-saturate-150",
          // Border and shadow - macOS style
          "border-0 ring-1 ring-black/10 dark:ring-white/10",
          "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(0,0,0,0.05)]",
          "dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)]",
          // Rounded corners - macOS Big Sur style
          "rounded-2xl",
          // Position higher on screen like Spotlight
          "top-[20%] translate-y-0",
          className
        )}
        showCloseButton={showCloseButton}>
        <Command className="bg-transparent">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CommandInput({
  className,
  ...props
}) {
  return (
    <div
      data-slot="command-input-wrapper"
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        // Search bar with #f9fafb color with slight opacity and backdrop blur
        "bg-[#f9fafb]/80 dark:bg-zinc-800/80",
        "backdrop-blur-sm",
        "border-b border-zinc-200/40 dark:border-zinc-700/40"
      )}>
      {/* Simple search icon without background */}
      <SearchIcon className="size-5 text-zinc-400 dark:text-zinc-500 shrink-0" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          "flex h-11 w-full bg-transparent text-xl font-normal",
          "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
          "outline-none disabled:cursor-not-allowed disabled:opacity-50",
          "text-zinc-900 dark:text-zinc-100",
          className
        )}
        {...props} />
    </div>
  );
}

function CommandList({
  className,
  ...props
}) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "max-h-[60vh] sm:max-h-[400px] overflow-x-hidden overflow-y-auto",
        "px-2 py-2",
        className
      )}
      {...props} />
  );
}

function CommandEmpty({
  ...props
}) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
      {...props} />
  );
}

function CommandGroup({
  className,
  ...props
}) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden",
        // Group heading styling - macOS style
        "[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold",
        "[&_[cmdk-group-heading]]:text-zinc-500 dark:[&_[cmdk-group-heading]]:text-zinc-400",
        "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider",
        "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:mb-1",
        className
      )}
      {...props} />
  );
}

function CommandSeparator({
  className,
  ...props
}) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("bg-zinc-200/60 dark:bg-zinc-700/40 h-px my-2 mx-2", className)}
      {...props} />
  );
}

function CommandItem({
  className,
  ...props
}) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        // Layout
        "relative flex items-center gap-3 px-3 py-2.5 mx-1 rounded-lg",
        "cursor-pointer select-none outline-none",
        // Typography
        "text-[14px] text-zinc-700 dark:text-zinc-200",
        // Transitions
        "transition-all duration-100 ease-out",
        // Selected state - macOS blue highlight
        "data-[selected=true]:bg-blue-500 data-[selected=true]:text-white",
        "data-[selected=true]:shadow-sm",
        // Icon colors
        "[&_svg]:size-[18px] [&_svg]:shrink-0",
        "[&_svg]:text-zinc-500 dark:[&_svg]:text-zinc-400",
        "data-[selected=true]:[&_svg]:text-white",
        // Disabled state
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        className
      )}
      {...props} />
  );
}

function CommandShortcut({
  className,
  ...props
}) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-[11px] font-medium tracking-wider",
        "text-zinc-400 dark:text-zinc-500",
        "group-data-[selected=true]:text-white/70",
        className
      )}
      {...props} />
  );
}

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}

"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

// ─── Context ──────────────────────────────────────────────────────
const ComboboxContext = React.createContext(null)

function useComboboxContext() {
    const ctx = React.useContext(ComboboxContext)
    if (!ctx) throw new Error("Combobox components must be used within <Combobox>")
    return ctx
}

// ─── Root ─────────────────────────────────────────────────────────
function Combobox({
    items = [],
    value,
    onValueChange,
    itemToStringValue,
    children,
    className,
    disabled = false,
    placeholder = "Select...",
    ...props
}) {
    const [open, setOpen] = React.useState(false)

    const selectedItem = React.useMemo(() => {
        if (value == null) return null
        return items.find((item) => {
            if (typeof item === "string") return item === value
            return item.value === value || item.userId === value || item.id === value
        }) || null
    }, [items, value])

    const getStringValue = React.useCallback(
        (item) => {
            if (itemToStringValue) return itemToStringValue(item)
            if (typeof item === "string") return item
            return item?.label || item?.name || String(item)
        },
        [itemToStringValue]
    )

    return (
        <ComboboxContext.Provider
            value={{
                items,
                value,
                onValueChange,
                selectedItem,
                getStringValue,
                open,
                setOpen,
                disabled,
                placeholder,
            }}
        >
            <Popover open={open} onOpenChange={setOpen} {...props}>
                {children}
            </Popover>
        </ComboboxContext.Provider>
    )
}

// ─── Trigger (auto-rendered with selected display) ────────────────
function ComboboxTrigger({ className, children, ...props }) {
    const { open, selectedItem, getStringValue, disabled, placeholder } = useComboboxContext()
    const hasChildren = React.Children.toArray(children).filter(Boolean).length > 0

    return (
        <PopoverTrigger asChild>
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn("w-full justify-between font-normal h-9 text-sm", className)}
                disabled={disabled}
                {...props}
            >
                {hasChildren ? (
                    children
                ) : selectedItem ? (
                    <span className="truncate">{getStringValue(selectedItem)}</span>
                ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                )}
                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>
        </PopoverTrigger>
    )
}

// ─── Content ──────────────────────────────────────────────────────
function ComboboxContent({ className, children, ...props }) {
    return (
        <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", className)} {...props}>
            <Command>
                {children}
            </Command>
        </PopoverContent>
    )
}

// ─── Input ────────────────────────────────────────────────────────
function ComboboxInput({ className, ...props }) {
    return <CommandInput className={cn("h-9", className)} {...props} />
}

// ─── Empty ────────────────────────────────────────────────────────
function ComboboxEmpty({ children, ...props }) {
    return <CommandEmpty {...props}>{children || "No results found."}</CommandEmpty>
}

// ─── List (render function pattern) ──────────────────────────────
function ComboboxList({ className, children, ...props }) {
    const { items } = useComboboxContext()

    return (
        <CommandList className={className} {...props}>
            <CommandGroup>
                {typeof children === "function"
                    ? items.map((item, idx) => (
                        <React.Fragment key={idx}>
                            {children(item, idx)}
                        </React.Fragment>
                    ))
                    : children}
            </CommandGroup>
        </CommandList>
    )
}

// ─── Item ─────────────────────────────────────────────────────────
function ComboboxItem({ value: itemValue, className, children, ...props }) {
    const { value, onValueChange, setOpen, getStringValue } = useComboboxContext()

    const itemId = typeof itemValue === "string"
        ? itemValue
        : itemValue?.value || itemValue?.userId || itemValue?.id

    const isSelected = value === itemId

    return (
        <CommandItem
            value={getStringValue(itemValue)}
            onSelect={() => {
                onValueChange?.(itemId === value ? null : itemId)
                setOpen(false)
            }}
            className={cn(className)}
            {...props}
        >
            <div className="flex items-center gap-2 flex-1">
                {children}
            </div>
            <Check className={cn("ml-auto h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
        </CommandItem>
    )
}

export {
    Combobox,
    ComboboxTrigger,
    ComboboxContent,
    ComboboxInput,
    ComboboxEmpty,
    ComboboxList,
    ComboboxItem,
}

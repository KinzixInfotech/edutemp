'use client';
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function WidgetContainer({ title, children, onRemove, className }) {
    return (
        <div className={cn(
            "relative group rounded-xl bg-muted p-0 overflow-hidden flex flex-col",
            className
        )}>
            <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0">
                <h3 className="font-semibold text-sm tracking-tight text-foreground">{title}</h3>
                {onRemove && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={onRemove}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
                {children}
            </div>
        </div>
    );
}

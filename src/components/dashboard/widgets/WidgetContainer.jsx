'use client';
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function WidgetContainer({ title, subtitle, children, onRemove, className, headerRight }) {
    return (
        <div className={cn(
            "relative group rounded-2xl bg-muted p-0 overflow-hidden flex flex-col  bg-white dark:bg-muted border",
            className
        )}>
            <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0 gap-2 flex-wrap">
                <div className="flex flex-col">
                    <h3 className="font-semibold text-sm tracking-tight text-foreground">{title}</h3>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {headerRight}
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
            </div>

            <div className="p-4 flex-1 flex flex-col">
                {children}
            </div>
        </div>
    );
}


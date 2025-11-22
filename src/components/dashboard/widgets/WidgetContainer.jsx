'use client';
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function WidgetContainer({ title, children, onRemove, className }) {
    return (
        <div className={cn(
            "relative group rounded-xl border border-border/50 bg-background/50 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden",
            className
        )}>
            {/* Gradient Border Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20">
                <h3 className="font-semibold text-sm tracking-tight text-foreground/90">{title}</h3>
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

            <div className="p-4">
                {children}
            </div>
        </div>
    );
}

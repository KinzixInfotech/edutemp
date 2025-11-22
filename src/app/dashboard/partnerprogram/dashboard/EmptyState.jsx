import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function EmptyState({
    title,
    description,
    actionLabel,
    onAction,
    icon: Icon,
    href
}) {
    return (
        <Card className="border-dashed border-2 bg-muted/10">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                {Icon && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="p-4 rounded-full bg-primary/10 text-primary"
                    >
                        <Icon className="w-8 h-8" />
                    </motion.div>
                )}
                <div className="space-y-2 max-w-sm">
                    <h3 className="font-semibold text-lg tracking-tight">{title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                {actionLabel && (
                    <div className="pt-2">
                        {href ? (
                            <a href={href}>
                                <Button variant="outline" className="gap-2">
                                    {actionLabel}
                                </Button>
                            </a>
                        ) : (
                            <Button onClick={onAction} variant="outline" className="gap-2">
                                {actionLabel}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

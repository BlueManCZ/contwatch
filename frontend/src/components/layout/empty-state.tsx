import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <Card className="border-dashed">
            <CardContent className="py-12 text-center animate-fade-in">
                {Icon && (
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                )}
                <p className="font-medium">{title}</p>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">{description}</p>
                )}
                {action && <div className="mt-4">{action}</div>}
            </CardContent>
        </Card>
    );
}

import { cn } from "@/lib/utils";

type StatusVariant = "online" | "warning" | "offline";

interface StatusIndicatorProps {
    variant: StatusVariant;
    label?: string;
    pulse?: boolean;
    size?: "sm" | "md";
}

const variantStyles: Record<StatusVariant, string> = {
    online: "bg-success",
    warning: "bg-warning",
    offline: "bg-muted-foreground/50",
};

export function StatusIndicator({ variant, label, pulse = true, size = "sm" }: StatusIndicatorProps) {
    const dotSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

    return (
        <div className="flex items-center gap-2">
            <span className="relative flex">
                {pulse && variant !== "offline" && (
                    <span
                        className={cn(
                            "absolute inline-flex h-full w-full rounded-full opacity-50 animate-ping",
                            variantStyles[variant],
                        )}
                    />
                )}
                <span className={cn("relative inline-flex rounded-full", dotSize, variantStyles[variant])} />
            </span>
            {label && <span className="text-xs text-muted-foreground">{label}</span>}
        </div>
    );
}

import { icons, type LucideProps } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

function toPascalCase(name: string): string {
    return name
        .split("-")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");
}

function resolveIcon(name: string): ComponentType<LucideProps> | undefined {
    return (icons as Record<string, ComponentType<LucideProps> | undefined>)[toPascalCase(name)];
}

/**
 * A safe icon component that resolves lucide icons by name.
 * Renders the fallback when the name is missing or invalid.
 */
export function SafeIcon({
    name,
    className,
    fallback,
}: {
    name: string | null | undefined;
    className?: string;
    /** Static fallback element. Defaults to invisible placeholder. */
    fallback?: ReactNode;
}) {
    const Icon = name ? resolveIcon(name) : undefined;

    if (!Icon) return <>{fallback ?? <span className={className} />}</>;

    return <Icon className={className} />;
}

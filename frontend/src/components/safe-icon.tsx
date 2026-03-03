import { Activity } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { Component, type ReactNode } from "react";

/** Error boundary that catches failed dynamic icon imports and renders a fallback. */
class IconErrorBoundary extends Component<
    { fallback: ReactNode; children: ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        return this.state.hasError ? this.props.fallback : this.props.children;
    }
}

/**
 * A DynamicIcon wrapper that gracefully falls back when the icon name is
 * missing, misspelled, or otherwise not found in the lucide-react library.
 *
 * Use this instead of `DynamicIcon` whenever the icon name comes from the DB.
 */
export function SafeIcon({
    name,
    className,
    fallback,
}: {
    name: string | null | undefined;
    className?: string;
    /** Static fallback element. Defaults to `<Activity>` with reduced opacity. */
    fallback?: ReactNode;
}) {
    const fb = fallback ?? <Activity className={className} style={{ opacity: 0.4 }} />;

    if (!name) return <>{fb}</>;

    return (
        <IconErrorBoundary fallback={fb}>
            <DynamicIcon
                // biome-ignore lint/suspicious/noExplicitAny: icon name is dynamic from backend
                name={name as any}
                fallback={() => fb}
                className={className}
            />
        </IconErrorBoundary>
    );
}

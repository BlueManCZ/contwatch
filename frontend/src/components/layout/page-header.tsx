import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
    title: string;
    suffix?: ReactNode;
    actions?: ReactNode;
}

export function PageHeader({ title, suffix, actions }: PageHeaderProps) {
    return (
        <header className="flex h-12 items-center gap-3 border-b bg-background px-3 sm:px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
            <div className={`flex items-center gap-3 min-w-0 shrink ${actions ? "max-sm:hidden" : ""}`}>
                <h1 className="text-sm font-semibold tracking-tight truncate">{title}</h1>
                {suffix}
            </div>
            {actions && <div className="ml-auto flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
    );
}

export function PageContent({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={`flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 ${className ?? ""}`}>{children}</div>;
}

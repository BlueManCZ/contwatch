import type { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
    title: string;
    suffix?: ReactNode;
    actions?: ReactNode;
}

export function PageHeader({ title, suffix, actions }: PageHeaderProps) {
    return (
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b bg-background/80 backdrop-blur-lg px-3 sm:px-4 -mx-3 sm:-mx-5 -mt-3 sm:-mt-5 mb-3 sm:mb-5">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
            <div className={`flex items-center gap-3 min-w-0 shrink ${actions ? "max-sm:hidden" : ""}`}>
                <h1 className="text-sm font-semibold tracking-tight truncate">{title}</h1>
                {suffix}
            </div>
            {actions && <div className="ml-auto flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
    );
}

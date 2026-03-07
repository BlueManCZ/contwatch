import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
    return (
        <SidebarProvider className="!min-h-0 h-dvh">
            <AppSidebar />
            <SidebarInset className="min-h-0 overflow-hidden">
                <div className="flex-1 flex flex-col min-h-0 animate-fade-in">{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
}

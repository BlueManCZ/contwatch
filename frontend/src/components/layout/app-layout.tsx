import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
    return (
        <SidebarProvider className="!min-h-0 h-dvh">
            <AppSidebar />
            <SidebarInset>
                <main className="flex-1 flex flex-col min-h-0 p-3 sm:p-5 animate-fade-in">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}

import { Link, useLocation } from "@tanstack/react-router";
import { Activity, Cable, LayoutDashboard, LogOut, ScrollText, Settings, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/providers/auth-provider";

const navItems = [
    { to: "/", icon: LayoutDashboard, labelKey: "nav.dashboard" },
    { to: "/inspector", icon: Activity, labelKey: "nav.inspector" },
    { to: "/handlers", icon: Cable, labelKey: "nav.handlers" },
    { to: "/actions", icon: Zap, labelKey: "nav.actions" },
    { to: "/logs", icon: ScrollText, labelKey: "nav.logs" },
    { to: "/admin", icon: Settings, labelKey: "nav.admin", adminOnly: true },
] as const;

export function AppSidebar() {
    const { t } = useTranslation();
    const { logout, user } = useAuth();
    const location = useLocation();

    return (
        <Sidebar>
            <SidebarHeader className="p-4">
                <span className="text-lg font-bold">{t("common.appName")}</span>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems
                                .filter(
                                    (item) =>
                                        !("adminOnly" in item && item.adminOnly) || user?.role === "admin",
                                )
                                .map((item) => (
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton
                                            render={<Link to={item.to} />}
                                            isActive={location.pathname === item.to}
                                        >
                                            <item.icon />
                                            <span>{t(item.labelKey)}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{user?.username}</span>
                    <button
                        type="button"
                        onClick={logout}
                        className="text-muted-foreground hover:text-foreground"
                        title={t("auth.logout")}
                    >
                        <LogOut className="h-4 w-4" />
                    </button>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}

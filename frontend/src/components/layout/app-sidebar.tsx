import { Link, useLocation } from "@tanstack/react-router";
import { Activity, BarChart3, Cable, Gauge, LogOut, ScrollText, Settings, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
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
    SidebarSeparator,
    useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/providers/auth-provider";
import { ContwatchLogo } from "./contwatch-logo";
import { ThemeToggle } from "./theme-toggle";

const monitoringItems = [
    { to: "/", icon: Gauge, labelKey: "nav.dashboard" },
    { to: "/analytics", icon: Activity, labelKey: "nav.analytics" },
] as const;

const managementItems = [
    { to: "/devices", icon: Cable, labelKey: "nav.devices" },
    { to: "/workflow", icon: Workflow, labelKey: "nav.workflow" },
] as const;

const systemItems = [
    { to: "/logs", icon: ScrollText, labelKey: "nav.logs" },
    { to: "/stats", icon: BarChart3, labelKey: "nav.stats" },
    { to: "/settings", icon: Settings, labelKey: "nav.settings", adminOnly: true },
] as const;

export function AppSidebar() {
    const { t } = useTranslation();
    const { logout, user } = useAuth();
    const location = useLocation();
    const { isMobile, setOpenMobile } = useSidebar();

    const isActive = (path: string) => {
        if (path === "/") return location.pathname === "/";
        return location.pathname.startsWith(path);
    };

    const closeMobile = () => {
        if (isMobile) setOpenMobile(false);
    };

    const menuSize = isMobile ? "lg" : "default";

    return (
        <Sidebar collapsible="icon" className="border-r-0">
            <SidebarHeader className="px-4 py-5 group-data-[collapsible=icon]:px-0">
                <Link
                    to="/"
                    className="flex items-center gap-2.5 group group-data-[collapsible=icon]:justify-center"
                    onClick={closeMobile}
                >
                    <ContwatchLogo className="h-5 w-5 shrink-0 text-primary" />
                    <span className="text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
                        {t("common.appName")}
                    </span>
                    {import.meta.env.DEV && (
                        <Badge className="group-data-[collapsible=icon]:hidden text-[10px] font-bold px-1.5 py-0 bg-primary text-primary-foreground">
                            DEV
                        </Badge>
                    )}
                </Link>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>{t("nav.monitoring")}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {monitoringItems.map((item) => (
                                <SidebarMenuItem key={item.to}>
                                    <SidebarMenuButton
                                        render={<Link to={item.to} />}
                                        isActive={isActive(item.to)}
                                        onClick={closeMobile}
                                        size={menuSize}
                                    >
                                        <item.icon />
                                        <span>{t(item.labelKey)}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>{t("nav.management")}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {managementItems.map((item) => (
                                <SidebarMenuItem key={item.to}>
                                    <SidebarMenuButton
                                        render={<Link to={item.to} />}
                                        isActive={isActive(item.to)}
                                        onClick={closeMobile}
                                        size={menuSize}
                                    >
                                        <item.icon />
                                        <span>{t(item.labelKey)}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>{t("nav.system")}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {systemItems
                                .filter(
                                    (item) =>
                                        !("adminOnly" in item && item.adminOnly) || user?.role === "admin",
                                )
                                .map((item) => (
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton
                                            render={<Link to={item.to} />}
                                            isActive={isActive(item.to)}
                                            onClick={closeMobile}
                                            size={menuSize}
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

            <SidebarSeparator />

            <SidebarFooter className="px-3 py-3 group-data-[collapsible=icon]:px-0">
                <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
                    <div className="flex items-center gap-2 min-w-0 group-data-[collapsible=icon]:hidden">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-muted-foreground truncate">{user?.username}</span>
                    </div>
                    <div className="flex items-center gap-0.5 group-data-[collapsible=icon]:flex-col">
                        <ThemeToggle />
                        <button
                            type="button"
                            onClick={logout}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent cursor-pointer transition-colors"
                            title={t("auth.logout")}
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}

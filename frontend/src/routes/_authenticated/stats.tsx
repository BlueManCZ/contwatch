import { createFileRoute } from "@tanstack/react-router";
import type { TFunction } from "i18next";
import type { LucideIcon } from "lucide-react";
import {
    Activity,
    Cable,
    Calendar,
    Clock,
    Cpu,
    Database,
    Globe,
    HardDrive,
    History,
    Monitor,
    Radio,
    Server,
    Tags,
    Wifi,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useGetSystemStatsApiSystemStatsGet } from "@/api/generated/system/system";
import { PageContent, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/stats")({
    component: StatsPage,
});

// ── Formatters ──────────────────────────────────────────────

function formatUptime(totalSeconds: number, t: TFunction): string {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(t("stats.days", { count: days }));
    if (hours > 0) parts.push(t("stats.hours", { count: hours }));
    if (minutes > 0) parts.push(t("stats.minutes", { count: minutes }));
    if (parts.length === 0) parts.push(t("stats.seconds", { count: seconds }));

    return parts.join(", ");
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
    const value = bytes / 1024 ** exp;
    return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${BYTE_UNITS[exp]}`;
}

function formatRelativeTime(isoDate: string, locale: string): string {
    const seconds = Math.round((Date.now() - new Date(isoDate).getTime()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    if (seconds < 60) return rtf.format(-seconds, "second");
    if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), "minute");
    if (seconds < 86400) return rtf.format(-Math.round(seconds / 3600), "hour");
    return rtf.format(-Math.round(seconds / 86400), "day");
}

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toLocaleString();
}

// ── Components ──────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    subtitle,
    mono,
}: {
    icon: LucideIcon;
    label: string;
    value: ReactNode;
    subtitle?: string;
    mono?: boolean;
}) {
    return (
        <div className="group relative rounded-lg border border-border/60 bg-card/50 p-3 sm:p-4 transition-colors hover:bg-card/80">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[11px] font-medium leading-tight truncate">{label}</span>
            </div>
            <p className={`text-lg sm:text-xl font-semibold tracking-tight ${mono ? "data-value" : ""}`}>
                {value}
            </p>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
    );
}

function SectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
    return (
        <div className="flex items-center gap-2 mb-3">
            <Icon className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        </div>
    );
}

// ── Page ────────────────────────────────────────────────────

function StatsPage() {
    const { t, i18n } = useTranslation();
    const { data } = useGetSystemStatsApiSystemStatsGet({
        query: { refetchInterval: 10_000 },
    });
    const stats = data?.data;

    return (
        <>
            <PageHeader
                title={t("stats.title")}
                suffix={
                    stats && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                            v{stats.version}
                        </Badge>
                    )
                }
            />
            <PageContent className="space-y-8 max-w-5xl">
                {stats && (
                    <>
                        {/* ── Uptime hero ── */}
                        <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/50 p-5 sm:p-6">
                            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                        <Clock className="h-4 w-4" />
                                        <span className="text-xs font-medium uppercase tracking-wider">
                                            {t("stats.uptime")}
                                        </span>
                                    </div>
                                    <p className="text-3xl sm:text-4xl font-bold tracking-tight">
                                        {formatUptime(stats.uptime_seconds, t)}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1.5">
                                        {t("stats.runningSince")}
                                        <span className="data-value ml-1.5">
                                            {new Date(stats.started_at).toLocaleString(i18n.language)}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                        <Server className="h-3.5 w-3.5" />
                                        <span className="data-value">{stats.hostname}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ── System ── */}
                        <section>
                            <SectionHeader icon={Server} title={t("stats.sectionSystem")} />
                            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                                <StatCard
                                    icon={Cpu}
                                    label={t("stats.cpu")}
                                    value={`${stats.cpu_percent}%`}
                                    mono
                                />
                                <StatCard
                                    icon={HardDrive}
                                    label={t("stats.memory")}
                                    value={formatBytes(stats.memory_bytes)}
                                    mono
                                />
                                <StatCard
                                    icon={Database}
                                    label={t("stats.dbSize")}
                                    value={formatBytes(stats.db_size_bytes)}
                                    mono
                                />
                                <StatCard
                                    icon={Wifi}
                                    label={t("stats.socketioClients")}
                                    value={stats.socketio_clients}
                                    mono
                                />
                            </div>
                        </section>

                        {/* ── Data ── */}
                        <section>
                            <SectionHeader icon={Database} title={t("stats.sectionData")} />
                            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                                <StatCard
                                    icon={Database}
                                    label={t("stats.dataPointsTotal")}
                                    value={`~${formatNumber(stats.data_points_total)}`}
                                    mono
                                />
                                <StatCard
                                    icon={Calendar}
                                    label={t("stats.dataPointsToday")}
                                    value={formatNumber(stats.data_points_today)}
                                    mono
                                />
                                <StatCard
                                    icon={Activity}
                                    label={t("stats.ingestionRate")}
                                    value={`${stats.data_points_today > 0 ? Math.round(stats.data_points_today / (new Date().getHours() + new Date().getMinutes() / 60 || 1)) : 0}/h`}
                                    mono
                                />
                                {stats.oldest_data_point && (
                                    <StatCard
                                        icon={History}
                                        label={t("stats.oldestDataPoint")}
                                        value={new Date(stats.oldest_data_point).toLocaleDateString(
                                            i18n.language,
                                        )}
                                    />
                                )}
                            </div>
                        </section>

                        {/* ── Handlers ── */}
                        <section>
                            <SectionHeader icon={Cable} title={t("stats.sectionHandlers")} />
                            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                                <StatCard
                                    icon={Cable}
                                    label={t("stats.handlersConnected")}
                                    value={`${stats.handlers_connected} / ${stats.handlers_total}`}
                                    mono
                                />
                                <StatCard
                                    icon={Tags}
                                    label={t("stats.attributes")}
                                    value={stats.attributes_total}
                                    mono
                                />
                                {stats.last_message_at && (
                                    <StatCard
                                        icon={Radio}
                                        label={t("stats.lastMessage")}
                                        value={formatRelativeTime(stats.last_message_at, i18n.language)}
                                    />
                                )}
                            </div>
                        </section>

                        {/* ── Host ── */}
                        <section>
                            <SectionHeader icon={Monitor} title={t("stats.sectionHost")} />
                            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                                <StatCard
                                    icon={Server}
                                    label={t("stats.hostname")}
                                    value={stats.hostname}
                                    mono
                                />
                                <StatCard icon={Globe} label={t("stats.hostIp")} value={stats.host_ip} mono />
                                <StatCard icon={Monitor} label={t("stats.os")} value={stats.os_info} mono />
                                <StatCard icon={Cpu} label={t("stats.arch")} value={stats.arch} mono />
                            </div>
                        </section>
                    </>
                )}
            </PageContent>
        </>
    );
}

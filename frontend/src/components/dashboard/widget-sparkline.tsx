import { format, subDays } from "date-fns";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { DailyStatRead, DashboardWidget } from "@/api/generated/contWatchAPI.schemas";
import { useListDataStatsApiDataStatsGet } from "@/api/generated/data-stats/data-stats";
import { WidgetOverlayActions } from "@/components/dashboard/widget-overlay-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatStat } from "@/lib/format-value";
import { localizeAttributeLabel } from "@/lib/localize-attribute";
import type { WidgetStatus } from "@/lib/widget-status";

const SPARKLINE_DAYS = 14;

interface WidgetSparklineProps {
    widget: DashboardWidget;
    status?: WidgetStatus;
    onRemove?: () => void;
    onEdit?: () => void;
    onClick?: () => void;
}

/** Mini SVG sparkline showing daily min/max range as a filled band. */
function SparklineSvg({ stats, color }: { stats: DailyStatRead[]; color: string }) {
    const width = 200;
    const height = 48;
    const padding = 2;

    if (stats.length < 2) {
        return (
            <div
                className="flex items-center justify-center text-[10px] text-muted-foreground/50"
                style={{ width, height }}
            >
                —
            </div>
        );
    }

    // Find global min/max for scaling
    let globalMin = Number.POSITIVE_INFINITY;
    let globalMax = Number.NEGATIVE_INFINITY;
    for (const s of stats) {
        if (s.min_value != null && s.min_value < globalMin) globalMin = s.min_value;
        if (s.max_value != null && s.max_value > globalMax) globalMax = s.max_value;
    }
    const range = globalMax - globalMin || 1;

    const xStep = (width - padding * 2) / (stats.length - 1);

    function yPos(val: number) {
        return padding + (height - padding * 2) * (1 - (val - globalMin) / range);
    }

    // Build top line (max values) left-to-right, bottom line (min values) right-to-left
    const topPoints: string[] = [];
    const bottomPoints: string[] = [];
    for (let i = 0; i < stats.length; i++) {
        const x = padding + i * xStep;
        const s = stats[i];
        topPoints.push(`${x},${yPos(s.max_value ?? globalMin)}`);
        bottomPoints.unshift(`${x},${yPos(s.min_value ?? globalMin)}`);
    }

    const polygonPoints = [...topPoints, ...bottomPoints].join(" ");

    // Max line path for a crisp top edge
    const maxPath = topPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            style={{ height }}
            preserveAspectRatio="none"
            role="img"
            aria-label="Sparkline chart"
        >
            <polygon points={polygonPoints} fill={color} opacity={0.15} />
            <path d={maxPath} fill="none" stroke={color} strokeWidth={1.5} />
        </svg>
    );
}

export function WidgetSparkline({
    widget,
    status = "online",
    onRemove,
    onEdit,
    onClick,
}: WidgetSparklineProps) {
    const { t, i18n } = useTranslation();

    const dateRange = useMemo(() => {
        const today = new Date();
        return {
            from: format(subDays(today, SPARKLINE_DAYS - 1), "yyyy-MM-dd"),
            to: format(today, "yyyy-MM-dd"),
        };
    }, []);

    const { data, isLoading } = useListDataStatsApiDataStatsGet(
        {
            attribute_ids: String(widget.attribute_id),
            date_from: dateRange.from,
            date_to: dateRange.to,
        },
        { query: { enabled: !!widget.attribute_id } },
    );

    const stats = (data?.data ?? []) as DailyStatRead[];

    const displayLabel =
        widget.name || localizeAttributeLabel(widget.attribute_name ?? "", widget.attribute_label, t, i18n);

    const color = widget.color || "oklch(0.68 0.12 225)";

    // Show latest day's min/max
    const latest = stats.length > 0 ? stats[stats.length - 1] : null;

    return (
        <Card
            className={`relative group overflow-hidden py-0 h-full transition-all duration-200 select-none${status === "offline" ? " opacity-40 grayscale" : status === "warning" ? " opacity-70" : ""}${onClick ? " cursor-pointer hover:shadow-lg hover:border-primary/30" : ""}`}
            onClick={onClick}
        >
            {/* Accent strip */}
            {status === "warning" ? (
                <div className="absolute inset-y-0 left-0 w-1 bg-warning" />
            ) : (
                widget.color && (
                    <div
                        className="absolute inset-y-0 left-0 w-1"
                        style={{ backgroundColor: widget.color }}
                    />
                )
            )}

            <CardContent className="p-3 pl-4 sm:p-4 sm:pl-5 h-full flex flex-col">
                <div className="space-y-1 min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider sm:tracking-widest line-clamp-1">
                        {displayLabel}
                    </p>

                    {isLoading ? (
                        <Skeleton className="h-12 w-full rounded" />
                    ) : (
                        <SparklineSvg stats={stats} color={color} />
                    )}

                    {latest && latest.min_value != null && latest.max_value != null && (
                        <div className="flex items-center gap-3">
                            <span
                                className="text-[11px] text-muted-foreground data-value"
                                title={t("dashboard.min")}
                            >
                                <span className="text-info">&#8595;</span>{" "}
                                {formatStat(latest.min_value, widget.unit, widget.rounding)}
                            </span>
                            <span
                                className="text-[11px] text-muted-foreground data-value"
                                title={t("dashboard.max")}
                            >
                                <span className="text-destructive-foreground">&#8593;</span>{" "}
                                {formatStat(latest.max_value, widget.unit, widget.rounding)}
                            </span>
                            <span className="text-[10px] text-muted-foreground/50 ml-auto">
                                {t("dashboard.sparklineDays", { count: SPARKLINE_DAYS })}
                            </span>
                        </div>
                    )}
                </div>

                <WidgetOverlayActions onEdit={onEdit} onRemove={onRemove} />
            </CardContent>
        </Card>
    );
}

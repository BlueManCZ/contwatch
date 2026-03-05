import { History, Minus, Pencil, TrendingDown, TrendingUp, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardTile } from "@/api/generated/contWatchAPI.schemas";
import { Card, CardContent } from "@/components/ui/card";
import { useLongPress } from "@/hooks/use-long-press";
import { formatStat, formatValue } from "@/lib/format-value";
import { localizeAttributeLabel } from "@/lib/localize-attribute";
import type { WidgetStatus } from "@/lib/widget-status";
import { useLiveValuesStore } from "@/stores/live-values";

export type { WidgetStatus } from "@/lib/widget-status";

interface WidgetTileProps {
    tile: DashboardTile;
    status?: WidgetStatus;
    onRemove?: () => void;
    onEdit?: () => void;
    onClick?: () => void;
}

export function WidgetTile({ tile, status = "online", onRemove, onEdit, onClick }: WidgetTileProps) {
    const { t, i18n } = useTranslation();
    const liveVal = useLiveValuesStore((s) => s.values[tile.attribute_id]);
    const longPress = useLongPress({ onLongPress: () => onEdit?.(), disabled: !onEdit });

    const displayLabel = localizeAttributeLabel(tile.name, tile.label, t, i18n);

    const value = liveVal?.value ?? tile.value;
    const trend = liveVal?.trend ?? tile.trend ?? 0;
    const statsStale = liveVal?.stats_stale ?? tile.stats_stale ?? false;
    const dailyMin = statsStale ? null : (liveVal?.daily_min ?? tile.daily_min);
    const dailyMax = statsStale ? null : (liveVal?.daily_max ?? tile.daily_max);
    const lastChanged = liveVal?.last_changed ?? tile.last_changed;

    const isBooleanValue = value === true || value === false || value === "true" || value === "false";
    const booleanOn = value === true || value === "true";

    const formatted =
        typeof value === "number" && tile.unit ? formatValue(value, tile.unit, tile.rounding) : null;
    const displayValue = value != null ? (isBooleanValue ? null : (formatted?.value ?? String(value))) : "-";
    const displayUnit = formatted?.unit ?? tile.unit;

    return (
        <Card
            className={`relative group overflow-hidden py-0 h-full transition-all duration-200 select-none${status === "offline" ? " opacity-40 grayscale" : status === "warning" ? " opacity-70" : ""}${onClick ? " cursor-pointer hover:shadow-lg hover:border-primary/30" : ""}`}
            onClick={(e) => {
                longPress.onClick(e);
                if (!e.defaultPrevented) onClick?.();
            }}
            onPointerDown={longPress.onPointerDown}
            onPointerMove={longPress.onPointerMove}
            onPointerUp={longPress.onPointerUp}
            onPointerCancel={longPress.onPointerCancel}
        >
            {/* Accent strip */}
            {status === "warning" ? (
                <div className="absolute inset-y-0 left-0 w-1 bg-warning" />
            ) : (
                tile.color && (
                    <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: tile.color }} />
                )
            )}

            <CardContent className="p-4 pl-5 h-full flex flex-col">
                <div className="space-y-1.5 min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest truncate">
                        {displayLabel}
                    </p>
                    {isBooleanValue ? (
                        <div className="flex items-center gap-2 h-[1.875rem]">
                            <div
                                className={`h-3 w-3 rounded-full shrink-0 ${booleanOn ? "bg-success shadow-[0_0_6px_theme(--color-success)]" : "bg-muted-foreground/30"}`}
                            />
                            <span className="text-xl font-semibold leading-none">
                                {t(booleanOn ? "dashboard.switchOn" : "dashboard.switchOff")}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-semibold data-value leading-none">
                                {displayValue}
                            </span>
                            {displayUnit && (
                                <span className="text-sm text-muted-foreground font-medium">
                                    {displayUnit}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {isBooleanValue && lastChanged && (
                    <div className="flex items-center justify-between mt-2.5">
                        <span className="text-[11px] text-muted-foreground data-value flex items-center gap-1">
                            <History
                                className={`h-3 w-3 ${booleanOn ? "text-info" : "text-destructive-foreground"}`}
                            />
                            {new Date(lastChanged).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    </div>
                )}

                {typeof value === "number" && (statsStale || dailyMin != null || dailyMax != null) && (
                    <div className="flex items-center gap-3 mt-2.5">
                        {statsStale ? (
                            <span className="text-[11px] text-muted-foreground/60">
                                {t("handlers.statsStale")}
                            </span>
                        ) : (
                            <>
                                {dailyMin != null && (
                                    <span
                                        className="text-[11px] text-muted-foreground data-value"
                                        title={t("dashboard.min")}
                                    >
                                        <span className="text-info">&#8595;</span>{" "}
                                        {formatStat(dailyMin, tile.unit, tile.rounding)}
                                    </span>
                                )}
                                {dailyMax != null && (
                                    <span
                                        className="text-[11px] text-muted-foreground data-value"
                                        title={t("dashboard.max")}
                                    >
                                        <span className="text-destructive-foreground">&#8593;</span>{" "}
                                        {formatStat(dailyMax, tile.unit, tile.rounding)}
                                    </span>
                                )}
                            </>
                        )}
                        <TrendIcon trend={trend} className="ml-auto" />
                    </div>
                )}

                {(onEdit || onRemove) && (
                    <div className="absolute top-2 right-2 hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit();
                                }}
                                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                title={t("dashboard.editTile")}
                            >
                                <Pencil className="h-3 w-3" />
                            </button>
                        )}
                        {onRemove && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                }}
                                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive-foreground hover:bg-destructive/10 transition-all"
                                title={t("dashboard.removeTile")}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function TrendIcon({ trend, className = "" }: { trend: number; className?: string }) {
    const base = `h-4 w-4 shrink-0 ${className}`;
    if (trend > 0) return <TrendingUp className={`${base} text-success`} />;
    if (trend < 0) return <TrendingDown className={`${base} text-destructive-foreground`} />;
    return <Minus className={`${base} text-muted-foreground/50`} />;
}

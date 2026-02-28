import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardTile } from "@/api/generated/contWatchAPI.schemas";
import { Card, CardContent } from "@/components/ui/card";
import { useLiveValuesStore } from "@/stores/live-values";

interface WidgetTileProps {
    tile: DashboardTile;
    onRemove?: () => void;
    onClick?: () => void;
}

export function WidgetTile({ tile, onRemove, onClick }: WidgetTileProps) {
    const { t } = useTranslation();
    const liveVal = useLiveValuesStore((s) => s.values[tile.attribute_id]);

    const value = liveVal?.value ?? tile.value;
    const trend = liveVal?.trend ?? tile.trend ?? 0;
    const dailyMin = liveVal?.daily_min ?? tile.daily_min;
    const dailyMax = liveVal?.daily_max ?? tile.daily_max;

    const displayValue =
        value != null ? (tile.rounding != null ? Number(value).toFixed(tile.rounding) : String(value)) : "-";

    const formatStat = (v: number) => (tile.rounding != null ? v.toFixed(tile.rounding) : String(v));

    return (
        <Card
            className={`relative group${onClick ? " cursor-pointer hover:bg-accent/50 transition-colors" : ""}`}
            style={tile.color ? { borderLeftColor: tile.color, borderLeftWidth: 4 } : undefined}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {tile.label || tile.name}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold tabular-nums">{displayValue}</span>
                            {tile.unit && <span className="text-sm text-muted-foreground">{tile.unit}</span>}
                        </div>
                    </div>
                    <TrendIcon trend={trend} />
                </div>
                {typeof value === "number" && (dailyMin != null || dailyMax != null) && (
                    <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                        {dailyMin != null && (
                            <span title={t("dashboard.min")}>
                                {"\u2193 "}
                                {formatStat(dailyMin)}
                            </span>
                        )}
                        {dailyMin != null && dailyMax != null && "  "}
                        {dailyMax != null && (
                            <span title={t("dashboard.max")}>
                                {"\u2191 "}
                                {formatStat(dailyMax)}
                            </span>
                        )}
                    </p>
                )}
                {onRemove && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove?.();
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-destructive transition-opacity"
                        title={t("dashboard.removeTile")}
                    >
                        &times;
                    </button>
                )}
            </CardContent>
        </Card>
    );
}

function TrendIcon({ trend }: { trend: number }) {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
}

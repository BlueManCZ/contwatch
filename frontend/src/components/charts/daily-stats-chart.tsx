import "@/lib/chart-setup";
import type { Chart, ChartOptions } from "chart.js";
import { ArrowDownToLine, LineChart, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
import type { DailyStatRead } from "@/api/generated/contWatchAPI.schemas";
import { useListDataStatsApiDataStatsGet } from "@/api/generated/data-stats/data-stats";
import { useListHandlersApiHandlersGet } from "@/api/generated/handlers/handlers";
import {
    ChartLegend,
    FloatingButton,
    FloatingPill,
    FloatingToolbar,
    FullscreenButton,
} from "@/components/floating-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { localizeAttributeLabel } from "@/lib/localize-attribute";
import { useSettingsStore } from "@/stores/settings";

/** Darken a color string by mixing with black via an offscreen canvas. */
function darken(color: string, amount = 0.15): string {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return color;
    ctx.fillStyle = color;
    const parsed = ctx.fillStyle; // browser-resolved hex/rgb
    // Parse rgb components
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = parsed;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    const factor = 1 - amount;
    return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

const DEFAULT_COLORS = [
    "oklch(0.78 0.14 70)",
    "oklch(0.68 0.12 225)",
    "oklch(0.72 0.15 155)",
    "oklch(0.65 0.14 300)",
    "oklch(0.70 0.17 15)",
    "oklch(0.72 0.10 180)",
    "oklch(0.75 0.12 100)",
    "oklch(0.65 0.16 340)",
];

function resolveThemeColors() {
    const s = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.classList.contains("dark");
    return {
        background: s.getPropertyValue("--background").trim(),
        foreground: s.getPropertyValue("--foreground").trim(),
        grid: isDark ? "oklch(0.5 0 0 / 0.2)" : "oklch(0.5 0 0 / 0.08)",
    };
}

interface DailyStatsChartProps {
    attributeIds: number[];
    dateFrom: string;
    dateTo: string;
    onDayClick?: (date: string) => void;
}

export function DailyStatsChart({ attributeIds, dateFrom, dateTo, onDayClick }: DailyStatsChartProps) {
    const { t, i18n } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const theme = useSettingsStore((s) => s.theme);

    const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

    const [themeColors, setThemeColors] = useState(() => resolveThemeColors());
    // biome-ignore lint/correctness/useExhaustiveDependencies: theme triggers CSS variable re-read
    useEffect(() => {
        setThemeColors(resolveThemeColors());
    }, [theme]);

    // Fetch handlers for attribute labels
    const { data: handlersData } = useListHandlersApiHandlersGet();
    const attributeMap = useMemo(() => {
        const map = new Map<
            number,
            { name: string; label: string | null; unit: string | null; color: string | null }
        >();
        for (const h of handlersData?.data ?? []) {
            for (const a of h.attributes ?? []) {
                map.set(a.id, {
                    name: a.name,
                    label: a.label ?? null,
                    unit: a.unit ?? null,
                    color: a.color ?? null,
                });
            }
        }
        return map;
    }, [handlersData]);

    // Fetch daily stats
    const { data, isLoading } = useListDataStatsApiDataStatsGet({
        attribute_ids: attributeIds.join(","),
        date_from: dateFrom,
        date_to: dateTo,
    });

    const stats = (data?.data ?? []) as DailyStatRead[];

    // Group stats by attribute_id
    const grouped = useMemo(() => {
        const map = new Map<number, DailyStatRead[]>();
        for (const s of stats) {
            const list = map.get(s.attribute_id) ?? [];
            list.push(s);
            map.set(s.attribute_id, list);
        }
        return map;
    }, [stats]);

    const { foreground: fgColor, background: bgColor, grid: gridColor } = themeColors;

    const resetBtnRef = useRef<HTMLElement>(null);
    const dismissBtnRef = useRef<HTMLElement>(null);

    const setResetBtnVisible = useCallback((visible: boolean) => {
        if (resetBtnRef.current) resetBtnRef.current.dataset.visible = String(visible);
    }, []);

    const dismissTooltip = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;
        chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
        chart.setActiveElements([]);
        chart.update();
        if (dismissBtnRef.current) dismissBtnRef.current.dataset.visible = "false";
        setSelectedDay(null);
    }, []);

    const syncZoomState = useCallback(
        ({ chart }: { chart: Chart }) => {
            setResetBtnVisible(chart.isZoomedOrPanned());
        },
        [setResetBtnVisible],
    );

    // Keep a stable ref to onDayClick for use in chart onClick
    const onDayClickRef = useRef(onDayClick);
    onDayClickRef.current = onDayClick;

    // Selected day pill: tap a bar → show pill with date + "open" action
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    // Build Chart.js floating bar datasets (each bar spans from min to max)
    // We use labels (dates) on x-axis + floating bars [min, max] on y-axis
    const allDates = useMemo(() => {
        const dateSet = new Set<string>();
        for (const s of stats) dateSet.add(s.date);
        return [...dateSet].sort();
    }, [stats]);
    const allDatesRef = useRef(allDates);
    allDatesRef.current = allDates;

    const chartData = useMemo(() => {
        const datasets = attributeIds.map((attrId, i) => {
            const attrStats = grouped.get(attrId) ?? [];
            const attr = attributeMap.get(attrId);
            const label = attr
                ? localizeAttributeLabel(attr.name, attr.label, t, i18n) +
                  (attr.unit ? ` (${attr.unit})` : "")
                : `Attribute ${attrId}`;
            const color = attr?.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];

            // Map stats to date-indexed for quick lookup
            const byDate = new Map(attrStats.map((s) => [s.date, s]));

            return {
                label,
                data: allDates.map((d) => {
                    const s = byDate.get(d);
                    return s ? ([s.min_value ?? 0, s.max_value ?? 0] as [number, number]) : null;
                }),
                backgroundColor: color,
                hoverBackgroundColor: darken(color),
                borderColor: color,
                hoverBorderColor: darken(color),
                borderWidth: 1,
                borderRadius: 2,
                borderSkipped: false as const,
            };
        });
        return { labels: allDates, datasets };
    }, [attributeIds, grouped, attributeMap, allDates, t, i18n]);

    // Begin at zero toggle + auto-enable for % units
    const [beginAtZero, setBeginAtZero] = useState(false);
    const hasPercentUnit = useMemo(
        () => attributeIds.some((id) => attributeMap.get(id)?.unit === "%"),
        [attributeIds, attributeMap],
    );
    const allPercentUnit = useMemo(
        () => attributeIds.length > 0 && attributeIds.every((id) => attributeMap.get(id)?.unit === "%"),
        [attributeIds, attributeMap],
    );
    const prevHasPercentRef = useRef(false);
    useEffect(() => {
        if (hasPercentUnit && !prevHasPercentRef.current) setBeginAtZero(true);
        prevHasPercentRef.current = hasPercentUnit;
    }, [hasPercentUnit]);
    const yMax = allPercentUnit && beginAtZero ? 100 : undefined;

    const chartOptions = useMemo<ChartOptions<"bar">>(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: "nearest",
                axis: "x",
                intersect: false,
            },
            onClick: (_event, elements) => {
                if (!elements.length) return;
                const idx = elements[0].index;
                const clickedDate = allDatesRef.current[idx];
                if (!clickedDate) return;
                // Desktop: navigate directly. Mobile: show pill.
                const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
                if (isTouchDevice) {
                    setSelectedDay(clickedDate);
                } else if (onDayClickRef.current) {
                    onDayClickRef.current(clickedDate);
                }
            },
            scales: {
                x: {
                    title: { display: false },
                    grid: { color: gridColor },
                    ticks: {
                        font: { family: "'IBM Plex Mono', monospace", size: 10 },
                        maxRotation: 45,
                    },
                    offset: true,
                },
                y: {
                    beginAtZero,
                    max: yMax,
                    title: { display: false },
                    grid: { color: gridColor },
                    ticks: { font: { family: "'IBM Plex Mono', monospace", size: 10 } },
                },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: fgColor,
                    titleColor: bgColor,
                    bodyColor: bgColor,
                    titleFont: { family: "'IBM Plex Mono', monospace" },
                    bodyFont: { family: "'Plus Jakarta Sans', sans-serif" },
                    callbacks: {
                        title(items) {
                            const label = items[0]?.label;
                            if (!label) return "";
                            return new Date(`${label}T00:00:00`).toLocaleDateString(i18n.language, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            });
                        },
                        label(ctx) {
                            const raw = ctx.raw as [number, number] | null;
                            if (!raw) return "";
                            return `${ctx.dataset.label}: ${raw[0]} – ${raw[1]}`;
                        },
                        afterBody() {
                            if (dismissBtnRef.current && window.matchMedia("(pointer: coarse)").matches)
                                dismissBtnRef.current.dataset.visible = "true";
                        },
                    },
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: "x" as const,
                        onPanStart: ({ chart }: { chart: Chart }) => {
                            const tooltip = chart.options.plugins?.tooltip;
                            if (tooltip) tooltip.enabled = false;
                            return undefined;
                        },
                        onPanComplete: ({ chart }: { chart: Chart }) => {
                            const tooltip = chart.options.plugins?.tooltip;
                            if (tooltip) tooltip.enabled = true;
                            chart.update();
                            syncZoomState({ chart });
                        },
                    },
                    zoom: {
                        wheel: { enabled: true, speed: 0.05 },
                        pinch: { enabled: true },
                        sensitivity: 0.2,
                        mode: "x" as const,
                        onZoomStart: ({ chart }: { chart: Chart }) => {
                            const tooltip = chart.options.plugins?.tooltip;
                            if (tooltip) tooltip.enabled = false;
                            return undefined;
                        },
                        onZoomComplete: ({ chart }: { chart: Chart }) => {
                            const tooltip = chart.options.plugins?.tooltip;
                            if (tooltip) tooltip.enabled = true;
                            chart.update();
                            syncZoomState({ chart });
                        },
                    },
                    limits: { x: { min: "original", max: "original", minRange: 7 } },
                },
            },
        }),
        [gridColor, fgColor, bgColor, beginAtZero, yMax, syncZoomState, i18n.language],
    );

    // Hidden datasets toggle
    const [hiddenDatasets, setHiddenDatasets] = useState<Set<number>>(() => new Set());
    const chartRef = useRef<Chart<"bar">>(null);

    const resetZoom = useCallback(() => {
        chartRef.current?.resetZoom();
        setResetBtnVisible(false);
    }, [setResetBtnVisible]);

    const toggleDataset = (index: number) => {
        const chart = chartRef.current;
        if (!chart) return;
        setHiddenDatasets((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
                chart.show(index);
            } else {
                next.add(index);
                chart.hide(index);
            }
            return next;
        });
    };

    if (isLoading) {
        return <Skeleton className="min-h-0 flex-1 w-full rounded-lg" />;
    }

    if (stats.length === 0) {
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                {t("chart.noData")}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative min-h-0 flex-1 -mx-3 sm:-mx-5 -mt-3 sm:-mt-5 -mb-3 sm:-mb-5 bg-background"
        >
            <div className="absolute inset-0 px-1 sm:px-2 pb-1 sm:pb-2">
                <Bar ref={chartRef} data={chartData} options={chartOptions} />
            </div>

            <ChartLegend
                items={chartData.datasets.map((ds, i) => ({
                    label: ds.label ?? "",
                    color: (ds.backgroundColor as string) || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
                }))}
                hiddenIndices={hiddenDatasets}
                onToggle={toggleDataset}
            />

            <FloatingToolbar>
                <FloatingButton
                    ref={dismissBtnRef}
                    collapsible
                    onClick={dismissTooltip}
                    title={t("chart.dismissTooltip")}
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                </FloatingButton>
                <FloatingButton
                    ref={resetBtnRef}
                    collapsible
                    onClick={resetZoom}
                    title={t("chart.resetZoom")}
                >
                    <RotateCcw className="h-4 w-4 text-muted-foreground" />
                </FloatingButton>
                <FloatingButton
                    className="ml-1.5"
                    active={beginAtZero}
                    onClick={() => setBeginAtZero((prev) => !prev)}
                    title={t("chart.beginAtZero")}
                >
                    <ArrowDownToLine
                        className={`h-4 w-4 ${beginAtZero ? "text-primary" : "text-muted-foreground"}`}
                    />
                </FloatingButton>
                <FullscreenButton className="ml-1.5" isFullscreen={isFullscreen} onClick={toggleFullscreen} />
            </FloatingToolbar>

            {selectedDay && onDayClick && (
                <FloatingPill
                    icon={LineChart}
                    label={selectedDay}
                    onClick={() => {
                        onDayClick(selectedDay);
                        setSelectedDay(null);
                    }}
                />
            )}
        </div>
    );
}

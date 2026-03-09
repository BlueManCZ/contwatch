import "@/lib/chart-setup";
import { useQueries } from "@tanstack/react-query";
import type { Chart, ChartData, ChartOptions } from "chart.js";
import { ArrowDownToLine, RotateCcw, ShieldAlert, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
import type { ChartDataset } from "@/api/generated/contWatchAPI.schemas";
import {
    chartDataApiDataUnitsChartGet,
    getChartDataApiDataUnitsChartGetQueryKey,
} from "@/api/generated/data-units/data-units";
import {
    ChartLegend,
    FloatingButton,
    FloatingToolbar,
    FullscreenButton,
    FullscreenPrompt,
} from "@/components/floating-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { useLiveValuesStore } from "@/stores/live-values";
import { useSettingsStore } from "@/stores/settings";

function setTooltipEnabled(chart: Chart, enabled: boolean) {
    const tooltip = chart.options.plugins?.tooltip;
    if (tooltip) tooltip.enabled = enabled;
}

/** Check if the chart's x-axis shows (approximately) the full data range. */
function isAtFullExtent(chart: Chart): boolean {
    const xScale = chart.scales.x;
    if (!xScale || !chart.data.datasets.length) return false;

    let dataMin = Number.POSITIVE_INFINITY;
    let dataMax = Number.NEGATIVE_INFINITY;
    for (const ds of chart.data.datasets) {
        for (const p of ds.data as Array<{ x: number }>) {
            if (p.x < dataMin) dataMin = p.x;
            if (p.x > dataMax) dataMax = p.x;
        }
    }

    const range = dataMax - dataMin;
    if (!Number.isFinite(range) || range <= 0) return true;

    const tolerance = range * 0.02;
    return xScale.min <= dataMin + tolerance && xScale.max >= dataMax - tolerance;
}

function resolveThemeColors() {
    const s = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.classList.contains("dark");
    return {
        background: s.getPropertyValue("--background").trim(),
        foreground: s.getPropertyValue("--foreground").trim(),
        grid: isDark ? "oklch(0.5 0 0 / 0.2)" : "oklch(0.5 0 0 / 0.08)",
    };
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

interface AttributeChartProps {
    attributeIds: number[];
    date: string;
    onOutOfRangeClick?: () => void;
}

export function AttributeChart({ attributeIds, date, onOutOfRangeClick }: AttributeChartProps) {
    const { t } = useTranslation();
    const chartRef = useRef<Chart<"line">>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const theme = useSettingsStore((s) => s.theme);

    const { isFullscreen, showPrompt, setShowPrompt, toggleFullscreen, enterFullscreen } =
        useFullscreen(containerRef);

    const resetBtnRef = useRef<HTMLElement>(null);
    const dismissBtnRef = useRef<HTMLElement>(null);

    const dismissTooltip = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;
        chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
        chart.setActiveElements([]);
        chart.update();
        if (dismissBtnRef.current) dismissBtnRef.current.dataset.visible = "false";
    }, []);

    const [themeColors, setThemeColors] = useState(() => resolveThemeColors());
    // biome-ignore lint/correctness/useExhaustiveDependencies: theme is an intentional trigger — when it changes, CSS variables update and we re-read them via resolveThemeColors()
    useEffect(() => {
        setThemeColors(resolveThemeColors());
    }, [theme]);

    // One query per attribute — React Query caches each (attribute, date) pair
    // individually, so adding a new attribute only fetches that one.
    const tzOffset = useMemo(() => new Date().getTimezoneOffset(), []);
    const queries = useQueries({
        queries: attributeIds.map((id) => {
            const params = { attribute_ids: String(id), date, tz_offset: tzOffset };
            return {
                queryKey: getChartDataApiDataUnitsChartGetQueryKey(params),
                queryFn: ({ signal }: { signal: AbortSignal }) =>
                    chartDataApiDataUnitsChartGet(params, { signal }),
            };
        }),
    });

    const isLoading = queries.length > 0 && queries.every((q) => q.isLoading);
    const datasets = queries.flatMap((q) => (q.data?.data ?? []) as ChartDataset[]);

    // Refetch chart data when live attribute values change (debounced).
    const refetchRef = useRef(() => {
        for (const q of queries) q.refetch();
    });
    refetchRef.current = () => {
        for (const q of queries) q.refetch();
    };
    useEffect(() => {
        const debounceMs = 10_000;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const unsub = useLiveValuesStore.subscribe((state, prev) => {
            const changed = attributeIds.some((id) => state.values[id] !== prev.values[id]);
            if (!changed || timer) return;
            timer = setTimeout(() => {
                refetchRef.current();
                timer = null;
            }, debounceMs);
        });

        return () => {
            unsub();
            if (timer) clearTimeout(timer);
        };
    }, [attributeIds]);
    const datasetsRef = useRef(datasets);
    if (datasetsRef.current !== datasets) {
        datasetsRef.current = datasets;
    }

    const [hiddenDatasets, setHiddenDatasets] = useState<Set<number>>(() => new Set());
    const [beginAtZero, setBeginAtZero] = useState(false);

    // Auto-enable beginAtZero when a % unit dataset is added
    const hasPercentUnit = datasets.some((ds) => ds.unit === "%");
    const allPercentUnit = datasets.length > 0 && datasets.every((ds) => ds.unit === "%");
    const prevHasPercentRef = useRef(false);
    useEffect(() => {
        if (hasPercentUnit && !prevHasPercentRef.current) {
            setBeginAtZero(true);
        }
        prevHasPercentRef.current = hasPercentUnit;
    }, [hasPercentUnit]);

    // Cap Y axis at 100 when viewing only % datasets with beginAtZero active
    const yMax = allPercentUnit && beginAtZero ? 100 : undefined;

    const toggleDataset = useCallback((index: number) => {
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
    }, []);

    // Guard ref to prevent resetZoom recursion (resetZoom fires onZoomComplete).
    const resettingRef = useRef(false);

    const { background: bgColor, foreground: fgColor, grid: gridColor } = themeColors;

    const setResetBtnVisible = useCallback((visible: boolean) => {
        if (resetBtnRef.current) resetBtnRef.current.dataset.visible = String(visible);
    }, []);

    const resetZoom = useCallback(() => {
        chartRef.current?.resetZoom();
        setResetBtnVisible(false);
    }, [setResetBtnVisible]);

    const syncZoomState = useCallback(
        ({ chart }: { chart: Chart }) => {
            setResetBtnVisible(chart.isZoomedOrPanned());
        },
        [setResetBtnVisible],
    );

    // Data prop — new reference whenever query data changes, which is what
    // we want: react-chartjs-2 will call chart.update() with the new data.
    const chartData: ChartData<"line"> = {
        datasets: datasets.map((ds, i) => ({
            label: ds.unit ? `${ds.label} (${ds.unit})` : ds.label,
            data: ds.data.map((p) => ({ x: p.x, y: p.y })),
            borderColor: ds.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
            backgroundColor: ds.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
            pointRadius: 0,
            pointHoverRadius: 3,
            pointHoverBackgroundColor: fgColor,
            borderWidth: 1.5,
        })),
    };

    // Options prop — stable reference so react-chartjs-2 never re-merges
    // options into the chart, which would reset the zoom plugin state.
    // Mutable values (datasets for tooltip, colors) accessed via refs.
    const chartOptions = useMemo<ChartOptions<"line">>(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: "nearest",
                axis: "xy",
                intersect: false,
            },
            scales: {
                x: {
                    type: "time",
                    time: {
                        unit: "hour",
                        displayFormats: { hour: "HH:mm", minute: "HH:mm" },
                        tooltipFormat: "HH:mm:ss",
                    },
                    title: { display: false },
                    grid: { color: gridColor },
                    ticks: { font: { family: "'IBM Plex Mono', monospace", size: 10 } },
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
                        label(ctx) {
                            const ds = datasetsRef.current[ctx.datasetIndex];
                            const val = ctx.parsed.y;
                            const unit = ds?.unit ? ` ${ds.unit}` : "";
                            return `${ds?.label}: ${val}${unit}`;
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
                            setTooltipEnabled(chart, false);
                            return undefined;
                        },
                        onPanComplete: ({ chart }: { chart: Chart }) => {
                            setTooltipEnabled(chart, true);
                            chart.update();
                            // If panned back to full extent, truly reset so auto-scaling works
                            if (!resettingRef.current && isAtFullExtent(chart)) {
                                resettingRef.current = true;
                                chart.resetZoom("none");
                                resettingRef.current = false;
                            }
                            syncZoomState({ chart });
                        },
                    },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: "x" as const,
                        onZoomStart: ({ chart }: { chart: Chart }) => {
                            setTooltipEnabled(chart, false);
                            return undefined;
                        },
                        onZoomComplete: ({ chart }: { chart: Chart }) => {
                            setTooltipEnabled(chart, true);
                            chart.update();
                            // If zoomed out to full extent, truly reset so auto-scaling works
                            if (!resettingRef.current && isAtFullExtent(chart)) {
                                resettingRef.current = true;
                                chart.resetZoom("none");
                                resettingRef.current = false;
                            }
                            syncZoomState({ chart });
                        },
                    },
                    limits: { x: { min: "original", max: "original" } },
                },
            },
        }),
        // Only recompute on theme change — never on data change
        [gridColor, fgColor, bgColor, syncZoomState, beginAtZero, yMax],
    );

    if (isLoading) {
        return <Skeleton className="min-h-0 flex-1 w-full rounded-lg" />;
    }

    const hasData = datasets.some((ds) => ds.data.length > 0);

    if (!hasData) {
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
                <Line ref={chartRef} data={chartData} options={chartOptions} />
            </div>
            <ChartLegend
                items={datasets.map((ds, i) => ({
                    label: ds.unit ? `${ds.label} (${ds.unit})` : ds.label,
                    color: ds.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
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
                {onOutOfRangeClick && (
                    <FloatingButton
                        className="ml-1.5"
                        onClick={onOutOfRangeClick}
                        title={t("inspector.checkOutOfRange")}
                    >
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </FloatingButton>
                )}
                <FullscreenButton className="ml-1.5" isFullscreen={isFullscreen} onClick={toggleFullscreen} />
            </FloatingToolbar>
            <FullscreenPrompt
                open={showPrompt}
                onOpenChange={setShowPrompt}
                onConfirm={() => {
                    setShowPrompt(false);
                    enterFullscreen();
                }}
            />
        </div>
    );
}

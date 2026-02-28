import "@/lib/chart-setup";
import type { Chart, ChartData, ChartOptions } from "chart.js";
import { useCallback, useRef } from "react";
import { Line } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
import type { ChartDataset } from "@/api/generated/contWatchAPI.schemas";
import { useChartDataApiDataUnitsChartGet } from "@/api/generated/data-units/data-units";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_COLORS = [
    "#3b82f6",
    "#ef4444",
    "#22c55e",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f97316",
];

interface AttributeChartProps {
    attributeIds: number[];
    date: string;
}

export function AttributeChart({ attributeIds, date }: AttributeChartProps) {
    const { t } = useTranslation();
    const chartRef = useRef<Chart<"line">>(null);

    const { data: response, isLoading } = useChartDataApiDataUnitsChartGet({
        attribute_ids: attributeIds.join(","),
        date,
    });

    const datasets = (response?.data ?? []) as ChartDataset[];

    const resetZoom = useCallback(() => {
        chartRef.current?.resetZoom();
    }, []);

    if (isLoading) {
        return <Skeleton className="h-72 w-full" />;
    }

    const hasData = datasets.some((ds) => ds.data.length > 0);

    if (!hasData) {
        return (
            <div className="flex h-72 items-center justify-center text-muted-foreground">
                {t("chart.noData")}
            </div>
        );
    }

    const chartData: ChartData<"line"> = {
        datasets: datasets.map((ds, i) => ({
            label: ds.unit ? `${ds.label} (${ds.unit})` : ds.label,
            data: ds.data.map((p) => ({ x: p.x, y: p.y })),
            borderColor: ds.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
            backgroundColor: ds.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
            stepped: "before" as const,
            pointRadius: 0,
            borderWidth: 1.5,
            tension: 0,
        })),
    };

    const chartOptions: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
            mode: "nearest",
            axis: "x",
            intersect: false,
        },
        scales: {
            x: {
                type: "time",
                time: {
                    unit: "hour",
                    displayFormats: {
                        hour: "HH:mm",
                        minute: "HH:mm",
                    },
                    tooltipFormat: "HH:mm:ss",
                },
                title: { display: false },
            },
            y: {
                title: { display: false },
            },
        },
        plugins: {
            legend: {
                display: datasets.length > 1,
            },
            tooltip: {
                callbacks: {
                    label(ctx) {
                        const ds = datasets[ctx.datasetIndex];
                        const val = ctx.parsed.y;
                        return ds?.unit ? `${ds.label}: ${val} ${ds.unit}` : `${ds?.label}: ${val}`;
                    },
                },
            },
            zoom: {
                pan: {
                    enabled: true,
                    mode: "x",
                },
                zoom: {
                    wheel: { enabled: true },
                    pinch: { enabled: true },
                    mode: "x",
                },
            },
        },
    };

    return (
        <div className="space-y-2">
            <div className="relative h-72">
                <Line ref={chartRef} data={chartData} options={chartOptions} />
            </div>
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={resetZoom}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    {t("chart.resetZoom")}
                </button>
            </div>
        </div>
    );
}

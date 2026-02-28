import type { Chart } from "chart.js";

export const options = {
    pointRadius: 0,
    borderWidth: 1,
    responsive: true,
    animation: false,
    maintainAspectRatio: false,
    parsing: false,
    interaction: {
        mode: "nearest",
        intersect: false,
        axis: "xy",
    },
    scales: {
        x: {
            type: "time",
            time: {
                unit: "hour",
                tooltipFormat: "",
            },
            beginAtZero: true,
        },
        y: {
            beginAtZero: true,
            stack: "main",
            stacked: false,
        },
    },
    plugins: {
        zoom: {
            zoom: {
                wheel: {
                    enabled: true,
                },
                pinch: {
                    enabled: true,
                },
                mode: "x",
                onZoomStart: ({ chart }: { chart: Chart }) => {
                    // @ts-expect-error Ignore
                    chart.config.options.plugins.tooltip.enabled = false;
                },
                onZoomComplete: ({ chart }: { chart: Chart }) => {
                    // @ts-expect-error Ignore
                    chart.config.options.plugins.tooltip.enabled = true;
                    chart.update();
                },
            },
            pan: {
                enabled: true,
                mode: "x",
                onPanStart: ({ chart }: { chart: Chart }) => {
                    // @ts-expect-error Ignore
                    chart.config.options.plugins.tooltip.enabled = false;
                },
                onPanComplete: ({ chart }: { chart: Chart }) => {
                    // @ts-expect-error Ignore
                    chart.config.options.plugins.tooltip.enabled = true;
                    chart.update();
                },
            },
            limits: {
                x: {
                    min: "original",
                    max: "original",
                },
            },
        },
        tooltip: {},
    },
};

import "chartjs-adapter-date-fns";

import {
    CategoryScale,
    Chart,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    TimeScale,
    Title,
    Tooltip,
} from "chart.js";
import { FC, useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";

import { useAttributeChart } from "../../bridge";
import { bemClassNames } from "../../utils";
import { options } from "./chartOptions";

Chart.register(CategoryScale, LinearScale, TimeScale, PointElement, LineElement, Title, Tooltip, Legend);

const bem = bemClassNames("inspector-chart");

type InspectorChartProps = {
    attributes?: number[];
};

export const InspectorChart: FC<InspectorChartProps> = ({ attributes = [] }) => {
    const ref = useRef<Chart>(null);

    // Loading the zoom plugin only on client side, because it doesn't support SSR
    useEffect(() => {
        if (typeof window !== "undefined")
            import("chartjs-plugin-zoom").then((zoomPlugin) => {
                Chart.register(zoomPlugin.default);
            });
    }, []);

    // Reset zoom on attributes change
    useEffect(() => {
        ref?.current?.resetZoom?.();
    }, [attributes]);

    const { data: attributeChartData } = useAttributeChart(attributes.sort());

    const data = {
        datasets:
            attributeChartData?.map((attributeChart) => ({
                label: attributeChart.label,
                data: attributeChart.data.map((data) => ({
                    x: data.x * 1000,
                    y: data.y,
                })),
                borderColor: "#5278FF",
            })) ?? [],
    };

    return (
        data.datasets.length > 0 && (
            <div className={bem()}>
                {/** @ts-ignore */}
                <Line {...{ ref, options, data }} />
            </div>
        )
    );
};

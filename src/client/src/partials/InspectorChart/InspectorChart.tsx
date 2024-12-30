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
import { FC, useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

import { useAttributeChart } from "../../bridge";
import { Button, ButtonVariant, FlexLayout, ThemedIconName } from "../../components";
import { bemClassNames } from "../../utils";
import { options } from "./chartOptions";

Chart.register(CategoryScale, LinearScale, TimeScale, PointElement, LineElement, Title, Tooltip, Legend);

const bem = bemClassNames("inspector-chart");

type InspectorChartProps = {
    attributes?: number[];
};

export const InspectorChart: FC<InspectorChartProps> = ({ attributes = [] }) => {
    const ref = useRef<Chart>(null);

    const [fullScreen, setFullScreen] = useState(false);

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
            <div className={bem({ fullScreen })}>
                <FlexLayout className={bem("toolbar")} gap="1rem">
                    <Button onClick={() => ref?.current?.resetZoom?.()}>Reset Zoom</Button>
                    <Button
                        onClick={() => setFullScreen((prev) => !prev)}
                        active={fullScreen}
                        variant={ButtonVariant.white}
                        icon={ThemedIconName.arrowMaximize}
                    />
                </FlexLayout>
                {/** @ts-ignore */}
                <Line {...{ ref, options, data }} />
            </div>
        )
    );
};

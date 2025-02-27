import "chartjs-adapter-date-fns";

import { selectLocaleState } from "@repo/store/slices/settingsSlice";
import { Button } from "@repo/ui/Button";
import { Flex } from "@repo/ui/Flex";
import { Column } from "@repo/ui/FlexPartials";
import { Input } from "@repo/ui/Input";
import { Separator } from "@repo/ui/Separator";
import { bemClassNames } from "@repo/utils/bemClassNames";
import { useTranslation } from "@repo/utils/useTranslation";
import {
    CategoryScale,
    Chart,
    type ChartOptions,
    type ChartType,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    TimeScale,
    Title,
    Tooltip,
    type TooltipItem,
} from "chart.js";
import { type FC, useCallback, useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { useSelector } from "react-redux";

import { useAttributeChart } from "../../../swrUtils";
import { options } from "./chartOptions";
import styles from "./InspectorChart.module.scss";

Chart.register(CategoryScale, LinearScale, TimeScale, PointElement, LineElement, Title, Tooltip, Legend);

const bem = bemClassNames(styles);

type InspectorChartProps = {
    attributes?: number[];
    date: string;
    onSettingsClick?: () => void;
    onDateChange?: (date: string) => void;
};

export const InspectorChart: FC<InspectorChartProps> = ({
    attributes = [],
    date,
    onSettingsClick,
    onDateChange,
}) => {
    const { t } = useTranslation();
    const lng = useSelector(selectLocaleState);

    // const ref = useRef<Chart>(null);
    const [ref, setRef] = useState<Chart | undefined>(undefined);
    const [zoomLevel, setZoomLevel] = useState<number>(1);

    const [fullScreen, setFullScreen] = useState(false);

    // Loading the zoom plugin only on client side, because it doesn't support SSR
    useEffect(() => {
        if (typeof window !== "undefined")
            import("chartjs-plugin-zoom").then((zoomPlugin) => {
                Chart.register(zoomPlugin.default);
            });
    }, []);

    const resetZoomLevel = useCallback(() => {
        setZoomLevel(1);
        ref?.resetZoom?.();
    }, [ref]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: Reset zoom on attributes change
    useEffect(() => {
        resetZoomLevel();
    }, [attributes, resetZoomLevel]);

    // TODO: Fetch each attribute data separately, this is bad for caching.
    const { data: attributeChartData } = useAttributeChart(attributes.sort(), date);

    // UseEffect to exit fullscreen when browser exits fullscreen
    useEffect(() => {
        const exitFullscreen = () => {
            if (!document.fullscreenElement) {
                setFullScreen(false);
            }
        };

        document.addEventListener("fullscreenchange", exitFullscreen);

        return () => {
            document.removeEventListener("fullscreenchange", exitFullscreen);
        };
    }, []);

    options.scales = {
        ...options.scales,
        x: {
            ...options.scales?.x,
            time: {
                unit: "hour",
                tooltipFormat: lng === "cs" ? "d.MM.yyyy HH:mm:ss" : "",
            },
        },
    };

    options.plugins.tooltip = {
        callbacks: {
            label: (chart: TooltipItem<ChartType>) => {
                const value = chart.dataset.data[chart.dataIndex] as { x: number; y: number };
                return `${chart.dataset.label}: ${value?.y} ${chart.dataset.stack ?? ""}`;
            },
        },
    };

    const data = {
        datasets:
            attributeChartData?.map((attributeChart) => ({
                label: attributeChart.label,
                stack: attributeChart.unit,
                data: attributeChart.data.map((data) => ({
                    x: data.x * 1000,
                    y: data.y,
                })),
                borderColor: attributeChart.color ?? "#5278FF",
            })) ?? [],
    };

    return (
        <Column className={bem({ fullScreen })} gap={"1rem"}>
            <Flex className={bem("toolbar")} gap="0.6rem">
                <Button
                    slim
                    icon={"arrow-left"}
                    onClick={() => {
                        onDateChange?.(
                            new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000)
                                .toISOString()
                                .split("T")[0] ?? "",
                        );
                    }}
                />
                <Input
                    type={"date"}
                    growMobile
                    value={date}
                    onValueChange={(value) =>
                        onDateChange?.(value !== "" ? value : (new Date().toISOString().split("T")[0] ?? ""))
                    }
                />
                <Button
                    slim
                    icon={"arrow-right"}
                    disabled={date === new Date().toISOString().split("T")[0]}
                    onClick={() => {
                        onDateChange?.(
                            new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
                                .toISOString()
                                .split("T")[0] ?? "",
                        );
                    }}
                />
                {fullScreen && <Separator width={"2rem"} />}
            </Flex>
            <Flex className={bem("chart")} grow height={0}>
                <Line
                    {...{ options: options as ChartOptions<"line">, data }}
                    ref={(ref) => setRef(ref as unknown as Chart)}
                    onWheel={() => setZoomLevel(ref?.getZoomLevel?.() ?? 1)}
                    onTouchEnd={() => setZoomLevel(ref?.getZoomLevel?.() ?? 1)}
                    height={"100%"}
                />
            </Flex>
            <Flex className={bem("toolbar")} gap="0.6rem">
                <Button slim icon={"wrench"} onClick={onSettingsClick}>
                    {t("Attributes")}
                </Button>
                {
                    <Button
                        disabled={zoomLevel === 1}
                        slim
                        icon={"zoom-out"}
                        onClick={() => {
                            resetZoomLevel();
                        }}
                    />
                }
                <Button
                    slim
                    icon={fullScreen ? "arrow-minimize" : "arrow-maximize"}
                    onClick={() => {
                        setFullScreen((prev) => {
                            if (prev) {
                                document.exitFullscreen();
                            } else {
                                document.documentElement.requestFullscreen();
                            }
                            return !prev;
                        });
                    }}
                >
                    {/*{t("Fullscreen")}*/}
                </Button>
            </Flex>
        </Column>
    );
};

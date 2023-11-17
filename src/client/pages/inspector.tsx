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
import { Line } from "react-chartjs-2";

import { useAttributeChart } from "../src/bridge";
import { Header, HeaderSize, Loc } from "../src/components";
import { NavbarLayout } from "../src/layouts";
import { GLOBAL_LOC_KEYS } from "../src/utils";

Chart.register(CategoryScale, LinearScale, TimeScale, PointElement, LineElement, Title, Tooltip, Legend);

export const options = {
    scales: {
        x: {
            type: "time",
            time: {
                unit: "hour",
            },
            beginAtZero: true,
        },
        y: {
            beginAtZero: true,
            stack: "main",
        },
    },
    pointRadius: 0,
    responsive: true,
    maintainAspectRatio: false,
};

export const App = () => {
    const attributes = [2, 3];

    const { data: attributeChartData } = useAttributeChart(attributes.sort());

    const data = {
        datasets:
            attributeChartData?.map((attributeChart) => ({
                label: attributeChart.label,
                data: attributeChart.data.map((data) => ({
                    x: data.x * 1000,
                    y: data.y,
                })),
                borderColor: "red",
            })) ?? [],
    };
    console.log(attributeChartData);

    return (
        <NavbarLayout>
            <Header size={HeaderSize.h2}>
                <Loc>{GLOBAL_LOC_KEYS.INSPECTOR}</Loc>
            </Header>
            <div style={{ width: "50dvw", height: "30dvw" }}>
                {/** @ts-ignore */}
                <Line options={options} data={data} />
            </div>
        </NavbarLayout>
    );
};

export default App;

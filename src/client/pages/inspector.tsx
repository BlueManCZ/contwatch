import {
    CategoryScale,
    Chart,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

import { Header, HeaderSize, Loc } from "../src/components";
import { NavbarLayout } from "../src/layouts";
import { GLOBAL_LOC_KEYS } from "../src/utils";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const options = {
    responsive: true,
};

const labels = ["January", "February", "March", "April", "May", "June", "July"];

export const data = {
    labels,
    datasets: [
        {
            label: "Dataset 1",
            data: [1, 54, 10, 36, 98, 54, 5],
            borderColor: "rgb(255, 99, 132)",
        },
        {
            label: "Dataset 2",
            data: [12, 43, 23, 76, 65, 43, 9],
            borderColor: "rgb(53, 162, 235)",
        },
    ],
};

export const App = () => {
    return (
        <NavbarLayout>
            <Header size={HeaderSize.h2}>
                <Loc>{GLOBAL_LOC_KEYS.INSPECTOR}</Loc>
            </Header>
            <div style={{ width: "50dvw", height: "30dvw" }}>
                <Line options={options} data={data} />
            </div>
        </NavbarLayout>
    );
};

export default App;

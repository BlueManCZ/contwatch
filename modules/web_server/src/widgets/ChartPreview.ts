export class ChartPreview {
    private readonly colors: string[];
    private element: HTMLElement;
    private readonly smartround: number;
    private readonly _chart: any;

    constructor(element: HTMLElement, smartround: number, colors: string[]) {
        this.colors = colors;
        this.element = element;
        this.smartround = smartround;

        // @ts-ignore
        // eslint-disable-next-line no-undef
        this._chart = new Chart(element, { // Chart.js library
            type: "line",
            data: {},
            options: {
                animation: false,
                events: [],
                scales: {
                    x: {
                        type: "time",
                        time: {
                            unit: "hour"
                        },
                        display: false,
                        beginAtZero: true
                    },
                    y: {
                        display: false
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false,
                        position: "nearest"
                    }
                },
                pointRadius: 0,
                borderWidth: 2,
                spanGaps: 30000000,
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    get chart(): any {
        return this._chart;
    }

    load(): void {
        let query = this.element.dataset.query;

        if (query.slice(-1) === ",") {
            query = query.slice(0, -1);
        }

        const d = new Date();

        const url = `/api/charts?query=${query}&date_from=${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}&smartround=${this.smartround}&cache=yes`;
        const request = new XMLHttpRequest();
        request.open("GET", url);
        request.setRequestHeader("Accept", "application/json");
        request.onreadystatechange = (): void => {
            if (request.readyState === 4) {
                const data = JSON.parse(request.responseText);

                let colorIndex = 0;

                for (const handler in data) {
                    for (const line in data[handler]) {
                        const datasetData = [];

                        for (let j = 0; j < data[handler][line].timestamps.length; j++) {
                            datasetData.push({
                                x: data[handler][line].timestamps[j] * 1000,
                                y: data[handler][line].values[j]
                            });
                        }

                        this.chart.data.datasets.push({
                            label: line,
                            borderColor: this.colors[colorIndex],
                            data: datasetData
                        });

                        this.chart.update();

                        colorIndex = (colorIndex + 1) % 5;
                    }
                }
            }
        };
        request.send();
    }
}

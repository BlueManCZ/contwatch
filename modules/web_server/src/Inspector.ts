import { BigChart } from "./widgets/BigChart";
import { dateISO, dateISOString } from "./utils/DateTime";

export class Inspector {
    private readonly colors: string[];
    private readonly inspectorElementId: string;
    private currentViewId: number;
    private bigChart: BigChart;
    private displayedCharts: { [name: string]: string[] };
    private dateSelector: HTMLInputElement;
    private configPanel: HTMLElement;

    constructor(id: string, colors: string[]) {
        this.colors = colors;
        this.inspectorElementId = id;
        this.currentViewId = -1;
        this.displayedCharts = {};
    }

    get element(): HTMLElement {
        return document.getElementById(this.inspectorElementId);
    }

    get canvas(): HTMLCanvasElement {
        return this.element.querySelector("canvas");
    }

    initialize(): void {
        this.clearChart();
        this.dateSelector = (document.getElementById("date-select") as HTMLInputElement);
        this.dateSelector.value = dateISOString();
        this.configPanel = document.getElementById("inspector-config-panel");
    }

    clearChart(): void {
        if (this.bigChart) {
            this.bigChart.destroy();
            this.clearCheckboxes();
        }
        this.bigChart = new BigChart(this.canvas, this.colors);
        this.element.addEventListener("transitionend", (): void => {
            this.bigChart.chart.resize(1, 1);
            this.bigChart.chart.resize();
        });
    }

    open(viewId: number, label: string): void {
        this.currentViewId = viewId;
        (<HTMLInputElement> document.getElementById("view-label")).value = label;
        this.show();
        this.initialize();
    }

    openEmpty(): void {
        this.open(-1, "");
    }

    clearCheckboxes(): void {
        const checkboxes = document.getElementsByClassName("inspector-data-checkbox");

        for (let i = 0; i < checkboxes.length; i++) {
            (<HTMLInputElement> checkboxes[i]).checked = false;
        }
    }

    addChart(handler: string, attribute: string, date?: string): void {
        if (!this.displayedCharts[handler]) {
            this.displayedCharts[handler] = [];
        }

        if (this.displayedCharts[handler].indexOf(attribute) === -1) {
            this.displayedCharts[handler].push(attribute);
        } else {
            return;
        }

        let query;
        if (attribute) {
            query = `${handler}-${attribute}`;
        } else {
            query = handler;
        }

        let dateFrom = dateISOString();

        if (typeof date !== "undefined") {
            dateFrom = date;
        }

        const currentView = this.currentViewId;

        const url = `/api/charts?query=${query}&date_from=${dateFrom}&date_to=${dateFrom}`;

        const request = new XMLHttpRequest();
        request.open("GET", url);
        request.setRequestHeader("Accept", "application/json");
        request.onreadystatechange = (): void => {
            if (request.readyState === 4) {
                if (currentView !== this.currentViewId) {
                    return;
                }

                const data = JSON.parse(request.responseText);

                for (const handler in data) {
                    for (const line in data[handler]) {
                        if (!data[handler][line].timestamps.length) {
                            break;
                        } else {
                            console.log(`${dateISO(new Date(data[handler][line].timestamps.slice(-1) * 1000))} == ${this.dateSelector.value}`);
                            if (dateISO(new Date(data[handler][line].timestamps.slice(-1) * 1000)) !== this.dateSelector.value) {
                                break;
                            }
                        }
                        const datasetData = [];

                        for (let j = 0; j < data[handler][line].timestamps.length; j++) {
                            datasetData.push({
                                x: data[handler][line].timestamps[j] * 1000,
                                y: data[handler][line].values[j]
                            });
                        }
                        const dataset = {
                            handler: handler,
                            label: line,
                            borderColor: this.colors[(this.bigChart.chart.data.datasets.length) % 5],
                            data: datasetData
                        };

                        this.bigChart.chart.data.datasets.push(dataset);

                        (<HTMLInputElement> document.getElementById(`${handler}-${line}`)).checked = true;

                        this.bigChart.sort();
                        this.bigChart.recolor();
                        this.bigChart.chart.update();
                    }
                }
            }
        };
        request.send();
    }

    removeChart(handler: string, attribute: string): void {
        let index = this.displayedCharts[handler].indexOf(attribute);
        this.displayedCharts[handler].splice(index, 1);

        for (const id in this.bigChart.chart.data.datasets) {
            const dataset = this.bigChart.chart.data.datasets[id];
            if (dataset.handler === handler && dataset.label === attribute) {
                index = this.bigChart.chart.data.datasets.indexOf(dataset);
                this.bigChart.chart.data.datasets.splice(index, 1);
                this.bigChart.recolor();
                this.bigChart.chart.update();
            }
        }
    }

    toggleChart(handler: string, attribute: string): void {
        const status = (<HTMLInputElement> document.getElementById(`${handler}-${attribute}`)).checked;

        if (status) {
            this.addChart(handler, attribute, this.dateSelector.value);
        } else {
            this.removeChart(handler, attribute);
        }
    }

    refreshChart() {
        this.clearChart();

        const charts = this.displayedCharts;
        this.displayedCharts = {};

        for (const handler in charts) {
            for (const attribute in charts[handler]) {
                this.addChart(handler, charts[handler][attribute], this.dateSelector.value);
            }
        }
    }

    saveView(): void {
        const data: { [name: string]: string | number | { [name: string]: [name: string]}} = {};

        data.view_id = this.currentViewId;
        data.label = (<HTMLInputElement> document.getElementById("view-label")).value;

        const settings: { [name: string]: [name: string]} = {};
        const checkboxes = document.getElementsByClassName("inspector-data-checkbox");

        for (let i = 0; i < checkboxes.length; i++) {
            const checkbox: HTMLInputElement = <HTMLInputElement> checkboxes[i];
            if (checkbox.checked) {
                const handler = checkbox.dataset.handler;
                const attribute = checkbox.dataset.attribute;
                if (settings[handler] === undefined) {
                    settings[handler] = [attribute];
                } else {
                    settings[handler].push(attribute);
                }
            }
        }

        data.settings = settings;

        const request = new XMLHttpRequest();
        request.open("POST", "/save_chart_view");
        request.setRequestHeader("Content-Type", "application/json");
        request.onload = (): void => {
            const data = JSON.parse(request.responseText);

            if (data.status) {
                this.currentViewId = data.view_id;
            } else {
                alert(data.error);
            }

            this.displayedCharts = {};
        };

        request.send(JSON.stringify(data));
    }

    deleteView(): void {
        if (!confirm("Are you sure you want to delete this view?")) {
            return;
        }

        if (this.currentViewId > -1) {
            const request = new XMLHttpRequest();
            request.onload = (): void => {
                const data = JSON.parse(request.responseText);
                if (!data.status) {
                    alert(data.error);
                }
                this.displayedCharts = {};
            };
            request.open("POST", `/delete_chart_view/${this.currentViewId}`);
            request.send();
        } else {
            this.hide();
        }
    }

    changDate(): void {
        this.refreshChart();
    }

    show(): void {
        this.element.classList.remove("inspector-chart-view-hidden");
    }

    hide(): void {
        this.element.classList.add("inspector-chart-view-hidden");
        this.displayedCharts = {};
    }

    showConfigPanel(): void {
        this.configPanel.style.display = "unset";
    }

    hideConfigPanel(): void {
        this.configPanel.style.display = "none";
    }
}

export class BigChart {
    private readonly colors: string[];
    private readonly element: HTMLElement;
    private _chart: any;

    constructor(element: HTMLElement, colors: string[]) {
        this.colors = colors;
        this.element = element;
        this.create();
    }

    get chart(): any {
        return this._chart;
    }

    create(): void {
        // @ts-ignore
        // eslint-disable-next-line no-undef
        this._chart = new Chart(this.element, { // Chart.js library
            type: "line",
            data: {
                datasets: []
            },
            options: {
                animation: false,
                interaction: {
                    mode: "nearest",
                    intersect: false,
                    axis: "x"
                },
                layout: {
                    padding: 20
                },
                scales: {
                    x: {
                        type: "time",
                        time: {
                            unit: "hour"
                        },
                        beginAtZero: true
                    },
                    y: {
                        beginAtZero: true,
                        stack: "main"
                    }
                },
                plugins: {
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: "x"
                        },
                        pan: {
                            enabled: true,
                            mode: "x"
                        },
                        limits: {
                            x: {
                                min: "original",
                                max: "original"
                            }
                        }
                    },
                    tooltip: {
                        position: "nearest",
                        callbacks: {
                            label: function(context: any) {
                                let label = context.dataset.label || "";

                                if (label) {
                                    label += ": ";
                                }
                                if (context.raw.payload) {
                                    label += JSON.stringify(context.raw.payload);
                                } else {
                                    label += context.parsed.y;
                                }
                                return label;
                            }
                        }
                    }
                },
                pointRadius: 0,
                borderWidth: 1,
                spanGaps: 30000000,
                responsive: true,
                maintainAspectRatio: false
            },
            plugins: [{
                id: "toolbarHider",
                afterEvent: (chart: any, evt: any, opts: any) => {
                    const { left, right, bottom, top } = chart.chartArea;
                    const e = evt.event;
                    const status = e.x >= left && e.x <= right && e.y <= bottom && e.y >= top;
                    if (status !== chart.options.plugins.tooltip.enabled) {
                        chart.options.plugins.tooltip.enabled = status;
                        chart.update();
                    }
                }
            }]
        });

        this.element.addEventListener("mouseup", (event) => {
            if (event.button === 1 || event.button === 2) {
                this.chart.resetZoom();
            }
        });
    }

    destroy(): void {
        this.chart.destroy();
    }

    sort(): void {
        this.chart.data.datasets.sort((a: any, b: any) => a.label.localeCompare(b.label));
    }

    recolor(): void {
        for (const id in this.chart.data.datasets) {
            const dataset = this.chart.data.datasets[id];
            dataset.borderColor = this.colors[parseInt(id) % 5];
        }
    }
}

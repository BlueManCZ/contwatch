import { ChartPreview } from "./ChartPreview";
import { post } from "../utils/URLTools";

export class Page {
    private readonly colors: string[];
    private element: HTMLElement;
    private readonly chartElements: HTMLCollectionOf<Element>;
    private _currentPage: string;
    private readonly config: Record<string, string | number | boolean>;
    private savedCharts: any;

    constructor(id: string, colors: string[]) {
        this.element = document.getElementById(id);
        this.chartElements = document.getElementsByClassName("chart");
        this.config = {};
        this.savedCharts = [];
        this.colors = colors;
    }

    get currentPage(): string {
        return this._currentPage;
    }

    set currentPage(pageName: string) {
        this._currentPage = pageName;
    }

    private setContent(content: string): void {
        this.element.innerHTML = content;
    }

    setConfigArgument(name: string, value: string | number | boolean): void {
        this.config[name] = value;
    }

    load(pageName: string): void {
        this.currentPage = pageName;

        post(`/${pageName}`, (request) => {
            this.setContent(request.responseText);
            this.setConfigArgument("action-routine-log", undefined);
            window.history.replaceState(pageName, pageName, `/${pageName}`);
            if (document.getElementById(pageName).onload) {
                document.getElementById(pageName).onload(undefined);
            }
            (window as any).app.loader.hide();
        }, this.config, "JSON");
    }

    refresh(): void {
        this.load(this.currentPage);
    }

    scrollUp(): void {
        this.element.scrollTo(0, 0);
    }

    displayCharts(smartround: number): void {
        this.destroyCharts();

        for (let i = 0; i < this.chartElements.length; i++) {
            const element = <HTMLElement> this.chartElements[i];

            const myChart = new ChartPreview(element, smartround, this.colors);
            this.savedCharts.push(myChart);
            myChart.load();
        }
    }

    destroyCharts(): void {
        for (let i = 0; i < this.savedCharts.length; i++) {
            this.savedCharts[i].chart.destroy();
        }
    }
}

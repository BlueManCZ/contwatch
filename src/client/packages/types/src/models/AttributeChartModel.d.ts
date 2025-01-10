type ChartPoint = {
    x: number;
    y: string;
};

export interface AttributeChartModel {
    id: number;
    label: string;
    data: ChartPoint[];
}

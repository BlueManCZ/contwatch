type ChartPoint = {
    x: number;
    y: string;
};

export interface AttributeChartModel {
    id: number;
    label: string;
    color?: string;
    data: ChartPoint[];
}

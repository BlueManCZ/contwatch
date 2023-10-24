import { Widget } from "./Widget";

export interface WidgetTileModel extends Widget {
    unit: string;
    value: string | number | boolean;
}

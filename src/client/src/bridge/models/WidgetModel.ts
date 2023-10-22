import { IconName } from "../../components";

export interface WidgetModel {
    id: number;
    name: string;
    handler: number;
    icon: IconName;
    attribute: string;
    unit: string;
    value: string | number | boolean;
}

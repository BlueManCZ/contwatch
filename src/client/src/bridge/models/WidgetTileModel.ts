import { IconName } from "../../components";

export interface WidgetTileModel {
    id: number;
    name: string;
    description: string;
    handler: number;
    icon: IconName;
    attribute: string;
    unit: string;
    value: string | number | boolean;
}

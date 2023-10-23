import { IconName } from "../../components";

export interface WidgetSwitchModel {
    id: number;
    name: string;
    description: string;
    handler: number;
    icon: IconName;
    attribute: string;
    active: boolean;
}

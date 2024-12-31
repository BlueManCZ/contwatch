import { IconName } from "../../components";

export interface AttributeModel {
    id: number;
    name: string;
    handler: number;
    enabled: boolean;
    unit?: string;
    label?: string;
    icon?: IconName;
    data: {
        handler_name: string;
        value?: string | number;
        status: number;
    };
}

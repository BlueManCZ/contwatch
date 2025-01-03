import { IconProps } from "@repo/ui/Icon";

export interface AttributeModel {
    id: number;
    name: string;
    handler: number;
    enabled: boolean;
    unit?: string;
    label?: string;
    icon?: IconProps["icon"];
    data: {
        handler_name: string;
        value?: string | number;
        status: 0 | 1 | 2;
        trend: -1 | 0 | 1;
    };
}

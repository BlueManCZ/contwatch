import type { IconProps } from "@repo/ui/Icon";

export interface AttributeModel {
    id: number;
    name: string;
    handler: number;
    enabled: boolean;
    unit?: string;
    label?: string;
    icon?: IconProps["icon"];
    data: {
        value?: string | number;
        trend: -1 | 0 | 1;
    };
}

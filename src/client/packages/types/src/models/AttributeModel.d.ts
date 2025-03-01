import type { IconType } from "../IconType";

export interface AttributeModel {
    id: number;
    name: string;
    handler?: number;
    enabled?: boolean;
    base_unit?: string;
    label?: string;
    icon?: IconType;
    order?: number;
    rounding?: number;
    color?: string;
    data?: {
        value?: string | number;
        unit?: string;
        trend: -1 | 0 | 1;
    };
}

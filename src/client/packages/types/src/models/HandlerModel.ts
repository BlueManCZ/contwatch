import type { IconProps } from "@repo/ui/Icon";

export enum HandlerStatus {
    DISCONNECTED = 0,
    CONNECTED = 1,
    DISABLED = 2,
}

export type HandlerConfig = Record<string, string>;

export interface HandlerOptions {
    label?: string;
    config: HandlerConfig;
}

export interface HandlerAttribute {
    id: number;
    name: string;
    label?: string;
    value: string | number;
}

export interface HandlerTypeModel {
    type: string;
    name: string;
    icon: IconProps["icon"];
    configFields?: Record<string, string[]>;
}

export interface HandlerModel extends HandlerTypeModel {
    id: number;
    description: string;
    status?: HandlerStatus;
    last_message?: number;
    options?: HandlerOptions;
    attributes?: HandlerAttribute[];
}

import { CustomIconName } from "../../components";

export enum HandlerStatus {
    DISCONNECTED,
    CONNECTED,
    DISABLED,
}

export type HandlerConfig = Record<string, string>;

export interface HandlerOptions {
    label?: string;
    config: HandlerConfig;
}

export interface HandlerAttribute {
    id: number;
    name: string;
    value: string | number;
}

export interface HandlerModel {
    id: number;
    type: string;
    name: string;
    icon: CustomIconName;
    description: string;
    status?: HandlerStatus;
    options?: HandlerOptions;
    configFields?: Record<string, string[]>;
    attributes?: HandlerAttribute[];
}

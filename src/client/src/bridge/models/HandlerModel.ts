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

export interface HandlerTypeModel {
    type: string;
    name: string;
    icon: CustomIconName;
    configFields?: Record<string, string[]>;
}

export interface HandlerModel extends HandlerTypeModel {
    id: number;
    description: string;
    status?: HandlerStatus;
    options?: HandlerOptions;
    attributes?: HandlerAttribute[];
}

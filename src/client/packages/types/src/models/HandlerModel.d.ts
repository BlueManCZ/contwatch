import type { IconType } from "../IconType";

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

export interface HandlerTypeModel {
    type: string;
    name: string;
    icon: IconType;
    configFields?: Record<string, string[]>;
}

export interface HandlerModel extends HandlerTypeModel {
    id: number;
    description: string;
    status?: HandlerStatus;
    last_message?: number;
    attributes: {
        id: number;
        name: string;
    }[];
    options?: HandlerOptions;
    availableAttributes: { name: string; value: string | number }[];
    actions: {
        [key: string]: {
            description: string;
            destination: string;
            params: Record<string, string>;
        };
    };
}

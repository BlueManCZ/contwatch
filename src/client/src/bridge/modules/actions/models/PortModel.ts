import { ControlTypes, SelectOption } from "flume/dist/types";

export interface PortModel {
    type: string;
    name: string;
    label: string;
    color: string;
    controls: {
        type: ControlTypes;
        name: string;
        label: string;
        options?: SelectOption[];
    }[];
    hidePort?: boolean;
}

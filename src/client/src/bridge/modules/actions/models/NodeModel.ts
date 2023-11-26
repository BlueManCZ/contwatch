import { PortTypeConfig } from "flume/dist/types";

export interface NodeModel {
    type: string;
    label: string;
    description: string;
    repeatableInput: string;
    inputs: PortTypeConfig[];
    outputs: PortTypeConfig[];
}

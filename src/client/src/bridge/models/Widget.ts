import { IconName } from "../../components";

export interface Widget {
    id: number;
    name: string;
    description: string;
    handler: number;
    status: number;
    icon: IconName;
    attribute: string;
}

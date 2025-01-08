import type { AttributeModel } from "@repo/types/AttributeModel";
import type { DataStatModel } from "@repo/types/DataStatModel";
import type { HandlerModel } from "@repo/types/HandlerModel";
import { Endpoint } from "@repo/utils/endpoints";
import { getApiEndpoint } from "@repo/utils/getApiEndpoint";

import { useCustomSWR } from "./swrEndpoints";

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class Handlers {
    static endpoint = (id?: number) => getApiEndpoint(Endpoint.handlers, id);
    static useOne = (id: number) => {
        return useCustomSWR<HandlerModel>(Handlers.endpoint(id));
    };
}

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class Attributes {
    static endpoint = (id?: number) => getApiEndpoint(Endpoint.attributes, id);
    static useOne = (id: number) => {
        return useCustomSWR<AttributeModel>(Attributes.endpoint(id));
    };
    static useAll = () => {
        return useCustomSWR<AttributeModel[]>(Attributes.endpoint());
    };
}

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class DataStats {
    static endpoint = () => getApiEndpoint(Endpoint.dataStats);
    static useAll = () => {
        return useCustomSWR<DataStatModel[]>(DataStats.endpoint());
    };
}

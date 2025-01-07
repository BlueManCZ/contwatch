import type { AttributeChartModel } from "@repo/types/AttributeChartModel";
import type { AttributeModel } from "@repo/types/AttributeModel";
import type { DataStatModel } from "@repo/types/DataStatModel";
import type { HandlerModel } from "@repo/types/HandlerModel";
import { getJson } from "@repo/utils/communication";
import { Endpoint } from "@repo/utils/endpoints";
import { getApiEndpoint } from "@repo/utils/getApiEndpoint";
import useSWR from "swr";

export const useHandlers = () => {
    return useSWR<HandlerModel[]>(getApiEndpoint(Endpoint.handlers), getJson);
};

export const useHandler = (id: number) => {
    return useSWR<HandlerModel>(`${getApiEndpoint(Endpoint.handlers)}/${id}`, getJson);
};

export const useAttributes = () => {
    return useSWR<AttributeModel[]>(getApiEndpoint(Endpoint.attributes), getJson);
};

export const useAttribute = (id: number) => {
    return useSWR<AttributeModel>(`${getApiEndpoint(Endpoint.attributes)}/${id}`, getJson);
};

export const useHandlerAttributes = (id: number) => {
    return useSWR<AttributeModel[]>(getApiEndpoint(Endpoint.attributes, `?handler=${id}`), getJson);
};

export const useDataStats = () => {
    return useSWR<DataStatModel[]>(getApiEndpoint(Endpoint.dataStats), getJson);
};

export const useAttributeChart = (attributeIds: number[], date?: string) => {
    return useSWR<AttributeChartModel[]>(
        `${getApiEndpoint(Endpoint.attributeChart)}/${attributeIds.join(",")}/${attributeIds.length > 0 ? (date ?? "") : ""}`,
        getJson,
    );
};

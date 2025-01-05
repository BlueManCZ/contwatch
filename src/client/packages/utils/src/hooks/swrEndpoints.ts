"use client";

import type { AttributeChartModel } from "@repo/types/AttributeChartModel";
import type { AttributeModel } from "@repo/types/AttributeModel";
import type { DataStatModel } from "@repo/types/DataStatModel";
import type { HandlerModel } from "@repo/types/HandlerModel";
import useSWR from "swr";

import { getJson } from "../communication";
import { Endpoint } from "../endpoints";
import { getApiEndpoint } from "../getApiEndpoint";

export const useHandlers = () => {
    return useSWR<HandlerModel[]>(getApiEndpoint(Endpoint.handlers), getJson);
};

export const useAttributes = () => {
    return useSWR<AttributeModel[]>(getApiEndpoint(Endpoint.attributes), getJson);
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

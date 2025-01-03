"use client";

import { AttributeModel } from "../../../types/src/models/AttributeModel";
import useSWR from "swr";

import { getJson } from "../communication";
import { Endpoint } from "../endpoints";
import { getApiEndpoint } from "../getApiEndpoint";
import { HandlerModel } from "@repo/types/HandlerModel";
import { DataStatModel } from "@repo/types/DataStatModel";
import { AttributeChartModel } from "@repo/types/AttributeChartModel";

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

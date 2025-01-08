"use client";

import type { AttributeChartModel } from "@repo/types/AttributeChartModel";
import { getJson } from "@repo/utils/communication";
import { Endpoint } from "@repo/utils/endpoints";
import { getApiEndpoint } from "@repo/utils/getApiEndpoint";
import useSWR from "swr";

export const useCustomSWR = <T>(endpoint: string) => {
    return useSWR<T>(endpoint, getJson, { revalidateOnFocus: false });
};

export const useAttributeChart = (attributeIds: number[], date?: string) => {
    return useSWR<AttributeChartModel[]>(
        `${getApiEndpoint(Endpoint.attributeChart)}/${attributeIds.join(",")}/${attributeIds.length > 0 ? (date ?? "") : ""}`,
        getJson,
    );
};

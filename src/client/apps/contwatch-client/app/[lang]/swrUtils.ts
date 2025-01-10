"use client";

import type { AttributeChartModel } from "@repo/types/AttributeChartModel";
import { getJson } from "@repo/utils/communication";
import { Endpoint } from "@repo/utils/endpoints";
import { getApiEndpoint } from "@repo/utils/getApiEndpoint";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";

export const customSWR = <T>(endpoint: string) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSWR<T>(endpoint, getJson, { revalidateIfStale: false, revalidateOnFocus: false });
};

export const customMutate = mutate;

export const useModel = <T>(attr: { data: T }) => {
    const originalValue = attr.data;
    const [model, setModel] = useState<T>(originalValue);

    useEffect(() => {
        setModel(originalValue);
    }, [originalValue]);

    const resetModel = () => {
        setModel(originalValue);
    };

    return { model, setModel, resetModel, originalValue };
};

export const useAttributeChart = (attributeIds: number[], date?: string) => {
    return useSWR<AttributeChartModel[]>(
        `${getApiEndpoint(Endpoint.attributeChart)}/${attributeIds.join(",")}/${attributeIds.length > 0 ? (date ?? "") : ""}`,
        getJson,
    );
};

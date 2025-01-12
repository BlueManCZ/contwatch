"use client";

import type { APIModel } from "@repo/types/APIModel";
import type { AttributeChartModel } from "@repo/types/AttributeChartModel";
import { getJson } from "@repo/utils/communication";
import { Endpoint } from "@repo/utils/endpoints";
import { getApiEndpoint } from "@repo/utils/getApiEndpoint";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";

import type { APIModelEndpoint, APIModelEndpointConfigOverride } from "./APIModels";

export const customSWR = <T>(endpoint: string) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSWR<T>(endpoint, getJson, { revalidateOnFocus: false });
};

export const customMutate = mutate;

export const useModel = <T extends APIModel | APIModel[]>(
    modelInstance: APIModelEndpoint,
    config?: APIModelEndpointConfigOverride,
) => {
    const { data: original } = modelInstance.use<T>(config);
    const [model, set] = useState<T | undefined>(original);
    const [refreshLock, setRefreshLock] = useState(false);
    const [commitLock, setCommitLock] = useState(true);

    useEffect(() => {
        if (!refreshLock) {
            set(original);
        }
    }, [refreshLock, original]);

    useEffect(() => {
        if (!commitLock && model) {
            modelInstance.update(model, undefined, config);
            setCommitLock(true);
        }
    }, [commitLock, config, model, modelInstance]);

    const reset = () => {
        set(original);
    };

    const commit = () => {
        setCommitLock(false);
    };

    const lock = () => {
        setRefreshLock(true);
    };

    const unlock = () => {
        setRefreshLock(false);
    };

    return { original, model, set, reset, commit, lock, unlock };
};

export const useAttributeChart = (attributeIds: number[], date?: string) => {
    return useSWR<AttributeChartModel[]>(
        `${getApiEndpoint(Endpoint.attributeChart)}/${attributeIds.join(",")}/${attributeIds.length > 0 ? (date ?? "") : ""}`,
        getJson,
    );
};

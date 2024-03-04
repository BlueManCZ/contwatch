import useSWR from "swr";

import { Endpoint, getApiEndpoint } from "../endpoints";
import { AttributeChartModel } from "../models/AttributeChart";
import { getJson } from "../utils";

export const useAttributeChart = (attributeIds: number[]) => {
    return useSWR<AttributeChartModel[]>(
        `${getApiEndpoint(Endpoint.attributeChart)}/${attributeIds.join(",")}`,
        getJson,
    );
};

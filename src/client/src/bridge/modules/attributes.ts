import useSWR from "swr";

import { Endpoint, getApiEndpoint } from "../endpoints";
import { AttributeModel } from "../models/AttributeModel";
import { getJson } from "../utils";

export const useAttributes = () => {
    return useSWR<AttributeModel[]>(getApiEndpoint(Endpoint.attributes), getJson);
};

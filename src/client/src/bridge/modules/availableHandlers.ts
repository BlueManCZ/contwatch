import useSWR from "swr";

import { Endpoint, getApiEndpoint } from "../endpoints";
import { HandlerModel } from "../models";
import { getJson } from "../utils";

export const useAvailableHandlers = () => {
    return useSWR<HandlerModel[]>(getApiEndpoint(Endpoint.availableHandlers), getJson);
};

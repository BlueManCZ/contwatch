import useSWR from "swr";

import { Endpoint, getApiEndpoint } from "../endpoints";
import { HandlerModel, NewHandlerModel } from "../models";
import { getJson, postJson } from "../utils";

export const useHandlers = () => {
    return useSWR<HandlerModel[]>(getApiEndpoint(Endpoint.handlers), getJson);
};

export const useHandler = (handlerId: number) => {
    return useSWR<HandlerModel>(`${getApiEndpoint(Endpoint.handlers)}/${handlerId}`, getJson);
};

export const addHandler = (
    handler: NewHandlerModel,
    onSuccess?: () => void,
    onError?: (error: any) => void,
) => {
    return postJson(getApiEndpoint(Endpoint.addHandler), handler, onSuccess, onError);
};

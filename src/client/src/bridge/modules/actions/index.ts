import { NodeMap } from "flume";
import useSWR from "swr";

import { Endpoint, getApiEndpoint } from "../../endpoints";
import { getJson, postJson } from "../../utils";
import { NodeModel, PortModel } from "./models";

export const useAvailableNodes = () => {
    return useSWR<NodeModel[]>(getApiEndpoint(Endpoint.availableNode), getJson);
};

export const useAvailablePorts = () => {
    return useSWR<PortModel[]>(getApiEndpoint(Endpoint.availablePorts), getJson);
};

export const fetchNodeMap = () => {
    return getJson(getApiEndpoint(Endpoint.nodeMap));
};

export const saveNodeMap = (nodeMap: NodeMap, onSuccess?: () => void, onError?: (error: any) => void) => {
    return postJson(getApiEndpoint(Endpoint.saveNodeMap), nodeMap, onSuccess, onError);
};

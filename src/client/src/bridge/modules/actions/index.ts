import useSWR from "swr";

import { Endpoint, getApiEndpoint } from "../../endpoints";
import { getJson } from "../../utils";
import { NodeModel, PortModel } from "./models";

export const useAvailableNodes = () => {
    return useSWR<NodeModel[]>(getApiEndpoint(Endpoint.availableNode), getJson);
};

export const useAvailablePorts = () => {
    return useSWR<PortModel[]>(getApiEndpoint(Endpoint.availablePorts), getJson);
};

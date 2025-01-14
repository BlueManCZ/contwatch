import { Endpoint } from "@repo/utils/endpoints";
import { getApiEndpoint } from "@repo/utils/getApiEndpoint";
import { io } from "socket.io-client";
import { customMutate, SWRModelEndpoint } from "swr-models";

import { fetchJson } from "../../src/utils";

export const Handlers = new SWRModelEndpoint({
    key: getApiEndpoint(Endpoint.handlers),
    serverFetcher: fetchJson,
});
export const Attributes = new SWRModelEndpoint({
    key: getApiEndpoint(Endpoint.attributes),
    serverFetcher: fetchJson,
});
export const DataStats = new SWRModelEndpoint({
    key: getApiEndpoint(Endpoint.dataStats),
    serverFetcher: fetchJson,
});

export const socket = io();

socket.on("mutate", (endpoint: string) => customMutate(getApiEndpoint(endpoint)));

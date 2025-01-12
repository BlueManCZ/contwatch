import { Endpoint } from "@repo/utils/endpoints";
import { getApiEndpoint } from "@repo/utils/getApiEndpoint";

import { APIModelEndpoint } from "./APIModels";

export const Handlers = new APIModelEndpoint({ key: getApiEndpoint(Endpoint.handlers) });
export const Attributes = new APIModelEndpoint({ key: getApiEndpoint(Endpoint.attributes) });
export const DataStats = new APIModelEndpoint({ key: getApiEndpoint(Endpoint.dataStats) });

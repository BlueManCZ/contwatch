import { jsonFetcherFactory } from "swr-models";

import { HOST, PORT, PROTOCOL } from "./settings.mjs";

export const fetchJson = jsonFetcherFactory(PROTOCOL, HOST, PORT, "force-cache", 600);

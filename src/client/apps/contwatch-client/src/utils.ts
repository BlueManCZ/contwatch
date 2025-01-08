import { fetchJsonFactory } from "@repo/utils/fetchJsonFactory";

import { HOST, PORT, PROTOCOL } from "./settings.mjs";

export const fetchJson = fetchJsonFactory(HOST, PORT, PROTOCOL);

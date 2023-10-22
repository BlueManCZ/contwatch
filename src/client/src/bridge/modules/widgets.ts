import useSWR from "swr";

import { Endpoint, getApiEndpoint } from "../endpoints";
import { WidgetModel } from "../models/WidgetModel";
import { getJson } from "../utils";

export const useWidgets = () => {
    return useSWR<WidgetModel[]>(getApiEndpoint(Endpoint.widgets), getJson);
};

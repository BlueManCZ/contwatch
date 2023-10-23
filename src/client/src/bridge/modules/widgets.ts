import useSWR from "swr";

import { Endpoint, getApiEndpoint } from "../endpoints";
import { WidgetSwitchModel, WidgetTileModel } from "../models";
import { getJson } from "../utils";

export const useWidgetSwitches = () => {
    return useSWR<WidgetSwitchModel[]>(getApiEndpoint(Endpoint.widgetSwitches), getJson);
};

export const useWidgetTiles = () => {
    return useSWR<WidgetTileModel[]>(getApiEndpoint(Endpoint.widgetTiles), getJson);
};

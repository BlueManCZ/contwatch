import useSWR from "swr";

import { Endpoint, getApiEndpoint } from "../endpoints";
import { WidgetSwitchModel, WidgetTileModel } from "../models";
import { getJson, postJson } from "../utils";

export const useWidgetSwitches = () => {
    return useSWR<WidgetSwitchModel[]>(getApiEndpoint(Endpoint.widgetSwitches), getJson);
};

export const useWidgetTiles = () => {
    return useSWR<WidgetTileModel[]>(getApiEndpoint(Endpoint.widgetTiles), getJson);
};

export const toggleWidgetSwitch = (
    widgetId: number,
    value: boolean,
    onSuccess?: () => void,
    onError?: (error: any) => void,
) => {
    return postJson(
        getApiEndpoint(Endpoint.widgetSwitchToggle) + `/${widgetId}`,
        { value },
        onSuccess,
        onError,
    );
};

export enum Endpoint {
    addHandler = "core/handlers/add-handler",
    availableHandlers = "core/handlers/available-handlers",
    handlers = "core/handlers",
    widgetTiles = "core/widgets/tiles",
    widgetSwitches = "core/widgets/switches",
    widgetSwitchToggle = "core/widgets/switches/toggle",
}
export const getApiEndpoint = (endpoint: Endpoint) => `/api/${endpoint}`;

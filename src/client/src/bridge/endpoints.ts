export enum Endpoint {
    addHandler = "core/handlers/add-handler",
    availableHandlers = "core/handlers/available-handlers",
    handlers = "core/handlers",
    widgetTiles = "core/widgets/tiles",
    widgetSwitches = "core/widgets/switches",
}
export const getApiEndpoint = (endpoint: Endpoint) => `/api/${endpoint}`;

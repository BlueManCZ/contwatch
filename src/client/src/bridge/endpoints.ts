export enum Endpoint {
    addHandler = "core/handlers/add-handler",
    availableHandlers = "core/handlers/available-handlers",
    handlers = "core/handlers",
    widgets = "core/widgets",
}
export const getApiEndpoint = (endpoint: Endpoint) => `/api/${endpoint}`;

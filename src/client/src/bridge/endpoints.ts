export enum Endpoint {
    addHandler = "core/add-handler",
    availableHandlers = "core/available-handlers",
    handlers = "core/handlers",
}
export const getApiEndpoint = (endpoint: Endpoint) => `/api/${endpoint}`;

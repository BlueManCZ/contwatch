export enum Endpoint {
    // Actions
    availableNode = "core/actions/available-nodes",
    availablePorts = "core/actions/available-ports",
    nodeMap = "core/actions/node-map",
    saveNodeMap = "core/actions/save-node-map",
    // Charts
    attributeChart = "core/charts/attribute",
    // Handlers
    handlers = "core/handlers",
    addHandler = "core/handlers/add-handler",
    availableHandlers = "core/handlers/available-handlers",
    // Widgets
    widgetTiles = "core/widgets/tiles",
    widgetSwitches = "core/widgets/switches",
    widgetSwitchToggle = "core/widgets/switches/toggle",
}
export const getApiEndpoint = (endpoint: Endpoint) => `/api/${endpoint}`;

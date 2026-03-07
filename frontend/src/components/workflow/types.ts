export type {
    NodeDefinition,
    PortDefinition,
    WorkflowData,
    WorkflowEdge,
    WorkflowNode,
} from "@/api/generated/contWatchAPI.schemas";

export const PORT_COLORS: Record<string, string> = {
    event: "#eab308",
    value: "#3b82f6",
    handler: "#22c55e",
    attribute: "#a855f7",
    action: "#f97316",
    operator: "#ef4444",
    aggregate: "#06b6d4",
    handler_data_key: "#14b8a6",
};

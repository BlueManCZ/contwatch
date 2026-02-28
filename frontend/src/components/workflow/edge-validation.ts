import type { IsValidConnection } from "@xyflow/react";
import type { NodeDefinition } from "@/api/generated/contWatchAPI.schemas";

/**
 * Creates a connection validator that only allows same-type port connections
 * (event<->event, value<->value, etc.)
 */
export function createConnectionValidator(
    definitions: Map<string, NodeDefinition>,
    getNodes: () => { id: string; type?: string }[],
): IsValidConnection {
    return (connection) => {
        const nodes = getNodes();
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);

        if (!sourceNode || !targetNode) return false;

        const sourceDef = definitions.get(sourceNode.type ?? "");
        const targetDef = definitions.get(targetNode.type ?? "");

        if (!sourceDef || !targetDef) return false;

        const sourcePort = (sourceDef.output_ports ?? []).find((p) => p.name === connection.sourceHandle);
        const targetPort = (targetDef.input_ports ?? []).find((p) => p.name === connection.targetHandle);

        if (!sourcePort || !targetPort) return false;

        return sourcePort.type === targetPort.type;
    };
}

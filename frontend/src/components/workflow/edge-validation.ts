import type { IsValidConnection } from "@xyflow/react";
import type { NodeDefinition, PortDefinition } from "@/api/generated/contWatchAPI.schemas";

/**
 * Find a port definition by handle name, supporting dynamic ports
 * (e.g. "value_0" matches a port named "value" with dynamic=true).
 */
function findPort(ports: PortDefinition[], handle: string): PortDefinition | undefined {
    const direct = ports.find((p) => p.name === handle);
    if (direct) return direct;
    const baseName = handle.replace(/_\d+$/, "");
    return ports.find((p) => p.name === baseName && p.dynamic);
}

/**
 * Creates a connection validator that:
 * 1. Only allows same-type port connections (event↔event, value↔value, etc.)
 * 2. Rejects multiple connections to value input ports (single-connection limit)
 */
export function createConnectionValidator(
    definitions: Map<string, NodeDefinition>,
    getNodes: () => { id: string; type?: string }[],
    getEdges: () => { target: string; targetHandle?: string | null }[],
): IsValidConnection {
    return (connection) => {
        const nodes = getNodes();
        const sourceNode = nodes.find((n) => n.id === connection.source);
        const targetNode = nodes.find((n) => n.id === connection.target);

        if (!sourceNode || !targetNode) return false;

        const sourceDef = definitions.get(sourceNode.type ?? "");
        const targetDef = definitions.get(targetNode.type ?? "");

        if (!sourceDef || !targetDef) return false;

        const sourcePort = findPort(sourceDef.output_ports ?? [], connection.sourceHandle ?? "");
        const targetPort = findPort(targetDef.input_ports ?? [], connection.targetHandle ?? "");

        if (!sourcePort || !targetPort) return false;

        if (sourcePort.type !== targetPort.type) return false;

        // Value input ports: single connection only
        if (targetPort.type === "value") {
            const edges = getEdges();
            const alreadyConnected = edges.some(
                (e) => e.target === connection.target && e.targetHandle === connection.targetHandle,
            );
            if (alreadyConnected) return false;
        }

        return true;
    };
}

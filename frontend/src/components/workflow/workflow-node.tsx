import { Handle, type Node, type NodeProps, Position, useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import type { NodeDefinition, PortDefinition } from "@/api/generated/contWatchAPI.schemas";
import { PORT_COLORS } from "./types";

type WorkflowNodeData = Record<string, string | undefined> & { _label?: string };

function PortHandle({ port, type }: { port: PortDefinition; type: "source" | "target" }) {
    const position = type === "target" ? Position.Left : Position.Right;
    const color = port.color || PORT_COLORS[port.type] || "#6b7280";

    return (
        <Handle
            type={type}
            position={position}
            id={port.name}
            title={port.label}
            style={{
                backgroundColor: color,
                width: 10,
                height: 10,
                border: "2px solid hsl(var(--background))",
            }}
        />
    );
}

export function createWorkflowNode(definition: NodeDefinition) {
    function WorkflowNodeComponent({ id, data }: NodeProps<Node<WorkflowNodeData>>) {
        const { updateNodeData } = useReactFlow();

        const handleChange = useCallback(
            (key: string, value: string) => {
                updateNodeData(id, { [key]: value });
            },
            [id, updateNodeData],
        );

        const inputPorts = definition.input_ports ?? [];
        const outputPorts = definition.output_ports ?? [];
        const inputPortsWithControl = inputPorts.filter((p) => p.control);
        const inputPortsWithoutControl = inputPorts.filter((p) => !p.control);

        return (
            <div className="rounded-lg border border-border bg-card shadow-md min-w-[180px]">
                {/* Header */}
                <div className="rounded-t-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground">
                    {data._label || definition.label}
                </div>

                {/* Handle-only input ports (no control) */}
                {inputPortsWithoutControl.map((port) => (
                    <div key={port.name} className="relative flex items-center px-3 py-1">
                        <PortHandle port={port} type="target" />
                        <span className="text-xs text-muted-foreground ml-2">{port.label}</span>
                    </div>
                ))}

                {/* Controls section */}
                {inputPortsWithControl.length > 0 && (
                    <div className="space-y-2 p-3">
                        {inputPortsWithControl.map((port) => {
                            const dataKey = port.data_key || port.name;
                            return (
                                <div key={port.name} className="relative">
                                    <PortHandle port={port} type="target" />
                                    <span className="text-xs text-muted-foreground mb-0.5 block ml-2">
                                        {port.label}
                                    </span>
                                    {port.control === "select" ? (
                                        <select
                                            aria-label={port.label}
                                            className="nodrag w-full rounded border border-input bg-background px-2 py-1 text-xs"
                                            value={data[dataKey] ?? ""}
                                            onChange={(e) => handleChange(dataKey, e.target.value)}
                                        >
                                            <option value="">—</option>
                                            {(port.options ?? []).map((opt) => {
                                                const val = opt.includes(": ") ? opt.split(": ")[0] : opt;
                                                return (
                                                    <option key={opt} value={val}>
                                                        {opt}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    ) : (
                                        <input
                                            aria-label={port.label}
                                            type={port.control === "number" ? "number" : "text"}
                                            className="nodrag w-full rounded border border-input bg-background px-2 py-1 text-xs"
                                            value={data[dataKey] ?? ""}
                                            onChange={(e) => handleChange(dataKey, e.target.value)}
                                            placeholder={port.label}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Output ports */}
                {outputPorts.map((port) => (
                    <div key={port.name} className="relative flex items-center justify-end px-3 py-1">
                        <span className="text-xs text-muted-foreground mr-2">{port.label}</span>
                        <PortHandle port={port} type="source" />
                    </div>
                ))}

                {/* Bottom padding */}
                {outputPorts.length > 0 && <div className="h-1" />}
            </div>
        );
    }

    WorkflowNodeComponent.displayName = `WorkflowNode(${definition.type})`;
    return WorkflowNodeComponent;
}

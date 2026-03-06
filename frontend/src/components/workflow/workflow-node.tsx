import { Handle, type Node, type NodeProps, Position, useNodeConnections, useReactFlow } from "@xyflow/react";
import { X } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { NodeDefinition, PortDefinition } from "@/api/generated/contWatchAPI.schemas";
import { TreeSelectControl } from "./tree-select-control";
import { PORT_COLORS } from "./types";

type WorkflowNodeData = Record<string, string | undefined> & { _label?: string };

function PortHandle({
    port,
    type,
    label,
}: {
    port: PortDefinition;
    type: "source" | "target";
    label: string;
}) {
    const position = type === "target" ? Position.Left : Position.Right;
    const color = port.color || PORT_COLORS[port.type] || "#6b7280";

    return (
        <Handle
            type={type}
            position={position}
            id={port.name}
            title={label}
            style={{
                backgroundColor: color,
                width: 14,
                height: 14,
                border: "2px solid var(--card)",
            }}
        />
    );
}

function FilteredSelect({
    port,
    value,
    onChange,
    disabled,
    filterPrefix,
}: {
    port: PortDefinition;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    filterPrefix?: string;
}) {
    const { t } = useTranslation();
    const options = useMemo(() => {
        const raw = port.options ?? [];
        if (!filterPrefix) return raw;
        return raw.filter((o) => o.group === filterPrefix);
    }, [port.options, filterPrefix]);

    const localizeLabel = useCallback(
        (label: string) => {
            if (port.type === "action") return t(`knownActions.${label.replaceAll(" ", "_")}`, label);
            return label;
        },
        [port.type, t],
    );

    return (
        <select
            aria-label={port.label}
            className={`nodrag w-full rounded border border-input bg-card text-card-foreground px-2 py-1 text-xs font-mono ${disabled ? "opacity-50" : ""}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="">—</option>
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {localizeLabel(opt.label)}
                </option>
            ))}
        </select>
    );
}

function ControlPort({
    port,
    dataKey,
    value,
    onChange,
    nodeData,
    label,
}: {
    port: PortDefinition;
    dataKey: string;
    value: string;
    onChange: (key: string, value: string) => void;
    nodeData: WorkflowNodeData;
    label: string;
}) {
    const isConnectable = port.type === "event" || port.type === "value";
    const connections = useNodeConnections({ handleType: "target", handleId: port.name });
    const isConnected = connections.length > 0;

    return (
        <div>
            <span className="text-[10px] text-muted-foreground mb-1 block px-3">{label}</span>
            <div className="relative flex items-center px-3 gap-1">
                {isConnectable && <PortHandle port={port} type="target" label={label} />}
                {isConnected && (
                    <svg className="shrink-0 w-3 h-3 text-primary" viewBox="0 0 16 16" fill="currentColor">
                        <title>Overridden by connection</title>
                        <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z" />
                        <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z" />
                    </svg>
                )}
                {port.control === "tree-select" ? (
                    <TreeSelectControl
                        options={port.options ?? []}
                        value={value}
                        onChange={(v) => onChange(dataKey, v)}
                        disabled={isConnected}
                        filterPrefix={nodeData.handler_id}
                    />
                ) : port.control === "select" ? (
                    <FilteredSelect
                        port={port}
                        value={value}
                        onChange={(v) => onChange(dataKey, v)}
                        disabled={isConnected}
                        filterPrefix={port.name === "action_id" ? nodeData.handler_id : undefined}
                    />
                ) : (
                    <input
                        aria-label={label}
                        type={port.control === "number" ? "number" : "text"}
                        className={`nodrag w-full rounded border border-input bg-card text-card-foreground px-2 py-1 text-xs font-mono ${isConnected ? "opacity-50" : ""}`}
                        value={value}
                        onChange={(e) => onChange(dataKey, e.target.value)}
                        placeholder={label}
                    />
                )}
            </div>
        </div>
    );
}

export function createWorkflowNode(definition: NodeDefinition) {
    function WorkflowNodeComponent({ id, data, selected }: NodeProps<Node<WorkflowNodeData>>) {
        const { updateNodeData, deleteElements } = useReactFlow();
        const { t } = useTranslation();

        const portLabel = (port: PortDefinition) => t(`workflow.ports.${port.name}`, port.label);

        const inputPorts = definition.input_ports ?? [];

        const handleChange = useCallback(
            (key: string, value: string) => {
                const update: Record<string, string> = { [key]: value };
                // When handler changes, clear dependent filtered ports
                if (key === "handler_id") {
                    for (const p of inputPorts) {
                        if (p.control === "tree-select" || p.name === "action_id") {
                            update[p.data_key || p.name] = "";
                        }
                    }
                }
                updateNodeData(id, update);
            },
            [id, updateNodeData, inputPorts],
        );
        const outputPorts = definition.output_ports ?? [];
        const inputPortsWithControl = inputPorts.filter((p) => p.control);
        const inputPortsWithoutControl = inputPorts.filter((p) => !p.control);

        const nodeLabel = data._label || t(`workflow.nodes.${definition.type}.label`, definition.label);

        return (
            <div
                className={`rounded-lg border bg-card shadow-lg min-w-[180px] ${data._error ? "ring-2 ring-destructive" : selected ? "ring-2 ring-primary/50" : ""}`}
            >
                {/* Header */}
                <div className="group/header rounded-t-lg bg-primary/10 border-b px-3 py-1.5 text-xs font-semibold text-foreground flex items-center">
                    <span className="flex-1 truncate">{nodeLabel}</span>
                    <button
                        type="button"
                        className="nodrag -mr-1 ml-1 h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity group-hover/header:opacity-100 hover:text-destructive hidden group-hover/header:flex"
                        onClick={() => deleteElements({ nodes: [{ id }] })}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>

                {/* Handle-only input ports */}
                {inputPortsWithoutControl.map((port) => (
                    <div key={port.name} className="relative flex items-center py-1.5 px-3">
                        <PortHandle port={port} type="target" label={portLabel(port)} />
                        <span className="text-[10px] text-muted-foreground">{portLabel(port)}</span>
                    </div>
                ))}

                {/* Controls section */}
                {inputPortsWithControl.length > 0 && (
                    <div className="space-y-3 py-2">
                        {inputPortsWithControl.map((port) => {
                            const dataKey = port.data_key || port.name;
                            return (
                                <ControlPort
                                    key={port.name}
                                    port={port}
                                    dataKey={dataKey}
                                    value={data[dataKey] ?? ""}
                                    onChange={handleChange}
                                    nodeData={data}
                                    label={portLabel(port)}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Output ports */}
                {outputPorts.map((port) => (
                    <div key={port.name} className="relative flex items-center justify-end py-1.5 px-3">
                        <span className="text-[10px] text-muted-foreground">{portLabel(port)}</span>
                        <PortHandle port={port} type="source" label={portLabel(port)} />
                    </div>
                ))}

                {outputPorts.length > 0 && <div className="h-1" />}
            </div>
        );
    }

    WorkflowNodeComponent.displayName = `WorkflowNode(${definition.type})`;
    return WorkflowNodeComponent;
}

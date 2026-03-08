import {
    addEdge,
    Background,
    type Connection,
    Controls,
    type Edge,
    type EdgeTypes,
    type HandleType,
    type Node,
    type NodeTypes,
    ReactFlow,
    useEdgesState,
    useNodesState,
    useOnSelectionChange,
    useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
    AlertCircle,
    AlignEndHorizontal,
    AlignEndVertical,
    AlignHorizontalSpaceBetween,
    AlignStartHorizontal,
    AlignStartVertical,
    AlignVerticalSpaceBetween,
    Bug,
    Check,
    Circle,
    LayoutGrid,
    Loader2,
    Trash2,
} from "lucide-react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { NodeDefinition, WorkflowData } from "@/api/generated/contWatchAPI.schemas";
import {
    getGetSubWorkflowApiSubWorkflowsSubWorkflowIdGetQueryKey,
    useGetSubWorkflowApiSubWorkflowsSubWorkflowIdGet,
    useSaveSubWorkflowGraphApiSubWorkflowsSubWorkflowIdGraphPut,
} from "@/api/generated/sub-workflows/sub-workflows";
import {
    getGetNodeDefinitionsApiActionsWorkflowNodesGetQueryKey,
    getGetWorkflowApiActionsWorkflowGetQueryKey,
    useGetNodeDefinitionsApiActionsWorkflowNodesGet,
    useGetWorkflowApiActionsWorkflowGet,
    useSaveWorkflowApiActionsWorkflowPut,
} from "@/api/generated/workflow/workflow";
import {
    FloatingButton,
    FloatingToolbar,
    FullscreenButton,
    FullscreenPrompt,
} from "@/components/floating-controls";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { getSocketInstance } from "@/providers/socket-provider";
import { useWorkflowStore } from "@/stores/workflow-store";
import {
    alignBottom,
    alignLeft,
    alignRight,
    alignTop,
    arrangeGrid,
    distributeHorizontally,
    distributeVertically,
} from "./align-actions";
import { DeletableEdge } from "./deletable-edge";
import { createConnectionValidator } from "./edge-validation";
import { PORT_COLORS } from "./types";
import { useTouchMultiSelect } from "./use-touch-multi-select";
import { createWorkflowNode, NodeDefinitionsProvider } from "./workflow-node";

const EMPTY_DEFINITIONS: NodeDefinition[] = [];
const EDGE_TYPES: EdgeTypes = { default: DeletableEdge };
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const ZOOM_LIMITS = { min: MIN_ZOOM, max: MAX_ZOOM };

let nodeIdCounter = 0;
function nextNodeId() {
    return `node_${Date.now()}_${nodeIdCounter++}`;
}

const SUB_WORKFLOW_TYPE_RE = /^sub_workflow_(\d+)$/;

function SelectionActions({
    onAlign,
    multiSelectActive,
    onExitMultiSelect,
}: {
    onAlign: (action: (nodes: Node[], ids: Set<string>) => Node[]) => void;
    multiSelectActive?: boolean;
    onExitMultiSelect?: () => void;
}) {
    const { t } = useTranslation();
    const { deleteElements } = useReactFlow();
    const [selectedCount, setSelectedCount] = useState(0);
    const selectedIdsRef = useRef<string[]>([]);

    const onChange = useCallback(({ nodes }: { nodes: Node[] }) => {
        selectedIdsRef.current = nodes.map((n) => n.id);
        setSelectedCount(nodes.length);
    }, []);

    useOnSelectionChange({ onChange });

    if (selectedCount === 0 && !multiSelectActive) return null;

    const iconBtn =
        "flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-colors hover:bg-accent";

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {multiSelectActive && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap text-[11px] font-medium text-primary">
                    {t("workflow.multiSelect", "Multi-select")}
                    {selectedCount > 0 && ` (${selectedCount})`}
                </div>
            )}
            <div className="flex items-center gap-1 rounded-full border bg-card/90 backdrop-blur-sm px-3 py-1.5 shadow-lg">
                {selectedCount >= 2 && (
                    <>
                        <button
                            type="button"
                            className={iconBtn}
                            title={t("workflow.align.left")}
                            onClick={() => onAlign(alignLeft)}
                        >
                            <AlignStartVertical className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className={iconBtn}
                            title={t("workflow.align.right")}
                            onClick={() => onAlign(alignRight)}
                        >
                            <AlignEndVertical className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className={iconBtn}
                            title={t("workflow.align.top")}
                            onClick={() => onAlign(alignTop)}
                        >
                            <AlignStartHorizontal className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className={iconBtn}
                            title={t("workflow.align.bottom")}
                            onClick={() => onAlign(alignBottom)}
                        >
                            <AlignEndHorizontal className="h-4 w-4" />
                        </button>
                        <div className="mx-0.5 h-4 w-px bg-border" />
                        <button
                            type="button"
                            className={iconBtn}
                            title={t("workflow.align.distributeH")}
                            onClick={() => onAlign(distributeHorizontally)}
                        >
                            <AlignHorizontalSpaceBetween className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className={iconBtn}
                            title={t("workflow.align.distributeV")}
                            onClick={() => onAlign(distributeVertically)}
                        >
                            <AlignVerticalSpaceBetween className="h-4 w-4" />
                        </button>
                        <div className="mx-0.5 h-4 w-px bg-border" />
                        <button
                            type="button"
                            className={iconBtn}
                            title={t("workflow.align.grid")}
                            onClick={() => onAlign(arrangeGrid)}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <div className="mx-0.5 h-4 w-px bg-border" />
                    </>
                )}
                {selectedCount > 0 && (
                    <button
                        type="button"
                        className={`${iconBtn} text-destructive`}
                        title={t("common.delete")}
                        onClick={() => {
                            deleteElements({ nodes: selectedIdsRef.current.map((id) => ({ id })) });
                            onExitMultiSelect?.();
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
                {multiSelectActive && (
                    <button
                        type="button"
                        className={`${iconBtn} text-xs text-muted-foreground`}
                        title={t("common.done", "Done")}
                        onClick={onExitMultiSelect}
                    >
                        <Check className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

export interface WorkflowEditorRef {
    addNode: (type: string) => void;
}

export interface WorkflowEditorProps {
    subWorkflowId?: number | null;
}

export const WorkflowEditor = forwardRef<WorkflowEditorRef, WorkflowEditorProps>(function WorkflowEditor(
    { subWorkflowId = null },
    ref,
) {
    const { t } = useTranslation();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReturnType<
        typeof import("@xyflow/react").useReactFlow
    > | null>(null);

    const isSubWorkflow = subWorkflowId != null;
    const context = isSubWorkflow ? "sub_workflow" : "main";

    const queryClient = useQueryClient();

    // Node definitions (context-aware)
    const { data: defsResponse, isLoading: defsLoading } = useGetNodeDefinitionsApiActionsWorkflowNodesGet({
        context,
    });

    // Main workflow data
    const { data: mainWorkflowResponse, isLoading: mainWorkflowLoading } =
        useGetWorkflowApiActionsWorkflowGet({
            query: { enabled: !isSubWorkflow },
        });

    // Sub-workflow data
    const { data: subWorkflowResponse, isLoading: subWorkflowLoading } =
        useGetSubWorkflowApiSubWorkflowsSubWorkflowIdGet(subWorkflowId ?? 0, {
            query: { enabled: isSubWorkflow },
        });

    const workflowLoading = isSubWorkflow ? subWorkflowLoading : mainWorkflowLoading;

    // Extract graph data from whichever source is active.
    // Return undefined while still loading to prevent the load effect from
    // firing with empty data before the real response arrives.
    const savedWorkflow = useMemo(() => {
        if (isSubWorkflow) {
            if (!subWorkflowResponse?.data) return undefined;
            const swData = subWorkflowResponse.data as { graph?: WorkflowData };
            return swData.graph ?? ({ nodes: [], edges: [] } as WorkflowData);
        }
        return mainWorkflowResponse?.data as WorkflowData | undefined;
    }, [isSubWorkflow, subWorkflowResponse, mainWorkflowResponse]);

    // Save mutations
    const mainSaveMutation = useSaveWorkflowApiActionsWorkflowPut({
        mutation: { meta: { skipGlobalErrorToast: true } },
    });
    const subSaveMutation = useSaveSubWorkflowGraphApiSubWorkflowsSubWorkflowIdGraphPut({
        mutation: { meta: { skipGlobalErrorToast: true } },
    });
    const saveMutation = isSubWorkflow ? subSaveMutation : mainSaveMutation;

    const [saveStatus, setSaveStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");

    const { isFullscreen, showPrompt, setShowPrompt, toggleFullscreen, enterFullscreen } =
        useFullscreen(reactFlowWrapper);

    const edgeDebug = useWorkflowStore((s) => s.edgeDebug);
    const setEdgeDebug = useWorkflowStore((s) => s.setEdgeDebug);
    const pushBreadcrumb = useWorkflowStore((s) => s.pushBreadcrumb);
    const toggleEdgeDebug = useCallback(() => {
        const next = !edgeDebug;
        setEdgeDebug(next);
        getSocketInstance()?.emit("workflow_edge_debug", { enabled: next });
    }, [edgeDebug, setEdgeDebug]);

    useEffect(() => {
        if (saveMutation.isPending) {
            setSaveStatus("saving");
        } else if (saveStatus === "saving") {
            if (saveMutation.isError) {
                setSaveStatus("error");
            } else {
                setSaveStatus("saved");
                const timer = setTimeout(() => setSaveStatus("idle"), 2000);
                return () => clearTimeout(timer);
            }
        }
    }, [saveMutation.isPending, saveMutation.isError, saveStatus]);

    const definitions = useMemo(
        () => (defsResponse?.data as NodeDefinition[] | undefined) ?? EMPTY_DEFINITIONS,
        [defsResponse?.data],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [loaded, setLoaded] = useState(false);

    // Reset loaded state when switching between workflows
    const prevIdRef = useRef(subWorkflowId);
    useEffect(() => {
        if (prevIdRef.current !== subWorkflowId) {
            prevIdRef.current = subWorkflowId;
            setLoaded(false);
            readyRef.current = false;
            changeCountRef.current = 0;
            lastSavedCountRef.current = 0;
            setSaveStatus("idle");
        }
    }, [subWorkflowId]);

    const definitionsMap = useMemo(() => {
        const map = new Map<string, NodeDefinition>();
        for (const def of definitions) {
            map.set(def.type, def);
        }
        return map;
    }, [definitions]);

    const nodeTypeKeys = definitions.map((d) => d.type).join(",");
    const nodeTypes = useMemo(() => {
        const types: NodeTypes = {};
        for (const key of nodeTypeKeys.split(",")) {
            if (key) types[key] = createWorkflowNode(key);
        }
        return types;
    }, [nodeTypeKeys]);

    const getEdgeStyle = useCallback(
        (sourceNodeType: string, sourceHandle: string | null | undefined) => {
            const def = definitionsMap.get(sourceNodeType);
            if (!def) return undefined;
            const port = (def.output_ports ?? []).find((p) => p.name === sourceHandle);
            if (!port) return undefined;
            const color = PORT_COLORS[port.type];
            return color ? { stroke: color, strokeWidth: 2 } : undefined;
        },
        [definitionsMap],
    );

    useEffect(() => {
        if (loaded || !savedWorkflow || definitions.length === 0) return;

        const loadedNodes: Node[] = (savedWorkflow.nodes ?? []).map((n) => ({
            id: n.id,
            // Normalize legacy PascalCase types (e.g. "HandlerListener" -> "handler_listener")
            type: n.type.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase(),
            position: n.position as { x: number; y: number },
            data: n.data ?? {},
        }));

        const loadedEdges: Edge[] = (savedWorkflow.edges ?? []).map((e) => {
            const sourceNode = loadedNodes.find((n) => n.id === e.source);
            let targetHandle = e.targetHandle ?? undefined;

            // Migrate legacy aggregator "value" handle to "value_0"
            const targetNode = loadedNodes.find((n) => n.id === e.target);
            if (targetNode?.type === "aggregator" && targetHandle === "value") {
                targetHandle = "value_0";
            }

            return {
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle ?? undefined,
                targetHandle,
                style: getEdgeStyle(sourceNode?.type ?? "", e.sourceHandle),
            };
        });

        setNodes(loadedNodes);
        setEdges(loadedEdges);
        setLoaded(true);

        // ReactFlow fires internal change events after setNodes/setEdges.
        // Wait for them to settle, then reset counters and enable tracking.
        setTimeout(() => {
            changeCountRef.current = 0;
            lastSavedCountRef.current = 0;
            readyRef.current = true;
        }, 300);
    }, [savedWorkflow, definitions, loaded, setNodes, setEdges, getEdgeStyle]);

    const getNodes = useCallback(() => nodes, [nodes]);
    const getEdges = useCallback(() => edges, [edges]);
    const isValidConnection = useMemo(
        () => createConnectionValidator(definitionsMap, getNodes, getEdges),
        [definitionsMap, getNodes, getEdges],
    );

    const addNodeAtPosition = useCallback(
        (type: string, position: { x: number; y: number }) => {
            const newNode: Node = {
                id: nextNodeId(),
                type,
                position,
                data: {},
            };
            setNodes((nds) => [...nds, newNode]);
            changeCountRef.current++;
        },
        [setNodes],
    );

    const handleAddNode = useCallback(
        (type: string) => {
            addNodeAtPosition(type, { x: 250 + Math.random() * 100, y: 150 + Math.random() * 100 });
        },
        [addNodeAtPosition],
    );

    useImperativeHandle(ref, () => ({ addNode: handleAddNode }), [handleAddNode]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData("application/reactflow");
            if (!type || !reactFlowInstance) return;

            const bounds = reactFlowWrapper.current?.getBoundingClientRect();
            if (!bounds) return;

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
            });

            addNodeAtPosition(type, position);
        },
        [reactFlowInstance, addNodeAtPosition],
    );

    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const saveMutateRef = useRef(saveMutation.mutate);
    saveMutateRef.current = saveMutation.mutate;
    const changeCountRef = useRef(0);
    const lastSavedCountRef = useRef(0);
    const readyRef = useRef(false);

    const touchReportChange = useCallback(() => {
        if (readyRef.current) changeCountRef.current++;
    }, []);
    const { multiSelectActive, exitMultiSelect } = useTouchMultiSelect(
        reactFlowWrapper,
        setNodes,
        reactFlowInstance,
        touchReportChange,
        ZOOM_LIMITS,
    );

    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);
    nodesRef.current = nodes;
    edgesRef.current = edges;

    const onSaveError = useCallback(
        (error: unknown) => {
            const axiosError = error as AxiosError<{ detail?: { node_id?: string; message?: string } }>;
            const nodeId = axiosError?.response?.data?.detail?.node_id;
            if (nodeId) {
                setNodes((nds) =>
                    nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, _error: true } } : n)),
                );
                toast.error(t("workflow.cycleDetected"));
            } else {
                const message = axiosError?.response?.data?.detail?.message;
                toast.error(message ?? t("workflow.error"));
            }
        },
        [setNodes, t],
    );

    const flushSave = useCallback(() => {
        if (changeCountRef.current === lastSavedCountRef.current) return;
        lastSavedCountRef.current = changeCountRef.current;

        const workflowData: WorkflowData = {
            nodes: nodesRef.current.map((n) => ({
                id: n.id,
                type: n.type ?? "",
                position: n.position,
                data: Object.fromEntries(Object.entries(n.data).filter(([k]) => !k.startsWith("_"))),
            })),
            edges: edgesRef.current.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle ?? "",
                targetHandle: e.targetHandle ?? "",
            })),
        };

        if (isSubWorkflow && subWorkflowId != null) {
            (saveMutateRef.current as typeof subSaveMutation.mutate)(
                { subWorkflowId, data: workflowData },
                {
                    onSuccess: () => {
                        queryClient.invalidateQueries({
                            queryKey: getGetSubWorkflowApiSubWorkflowsSubWorkflowIdGetQueryKey(subWorkflowId),
                        });
                        // Node definitions may change (port types derived from connections)
                        queryClient.invalidateQueries({
                            queryKey: getGetNodeDefinitionsApiActionsWorkflowNodesGetQueryKey(),
                        });
                    },
                    onError: (error) => {
                        onSaveError(error);
                    },
                },
            );
        } else {
            (saveMutateRef.current as typeof mainSaveMutation.mutate)(
                { data: workflowData },
                {
                    onSuccess: (response) => {
                        queryClient.setQueryData(getGetWorkflowApiActionsWorkflowGetQueryKey(), response);
                    },
                    onError: (error) => {
                        onSaveError(error);
                    },
                },
            );
        }
    }, [isSubWorkflow, subWorkflowId, queryClient, onSaveError]); // eslint-disable-line react-hooks/exhaustive-deps

    const clearErrorNodes = useCallback(() => {
        if (nodesRef.current.some((n) => n.data._error)) {
            setNodes((nds) =>
                nds.map((n) => (n.data._error ? { ...n, data: { ...n.data, _error: undefined } } : n)),
            );
        }
        if (saveStatus === "error") setSaveStatus("unsaved");
    }, [setNodes, saveStatus]);

    const wrappedOnNodesChange: typeof onNodesChange = useCallback(
        (changes) => {
            onNodesChange(changes);
            if (readyRef.current) {
                changeCountRef.current++;
                clearErrorNodes();
            }
        },
        [onNodesChange, clearErrorNodes],
    );

    const wrappedOnEdgesChange: typeof onEdgesChange = useCallback(
        (changes) => {
            onEdgesChange(changes);
            if (readyRef.current) {
                changeCountRef.current++;
                clearErrorNodes();
            }
        },
        [onEdgesChange, clearErrorNodes],
    );

    const wrappedOnConnect = useCallback(
        (connection: Connection) => {
            connectionMadeRef.current = true;
            const sourceNode = nodesRef.current.find((n) => n.id === connection.source);
            const style = getEdgeStyle(sourceNode?.type ?? "", connection.sourceHandle);
            setEdges((eds) => addEdge({ ...connection, style }, eds));
            if (readyRef.current) changeCountRef.current++;
        },
        [setEdges, getEdgeStyle],
    );

    // --- Node picker (connection-drop & right-click) ---
    interface NodePickerState {
        pickerPosition: { x: number; y: number };
        flowPosition: { x: number; y: number };
        connection?: {
            nodeId: string;
            handleId: string;
            handleType: HandleType;
            portType: string;
        };
    }

    const [nodePicker, setNodePicker] = useState<NodePickerState | null>(null);
    const connectStartRef = useRef<{
        nodeId: string;
        handleId: string;
        handleType: HandleType;
    } | null>(null);
    const connectionMadeRef = useRef(false);

    const onConnectStart = useCallback(
        (
            _: MouseEvent | TouchEvent,
            params: { nodeId: string | null; handleId: string | null; handleType: HandleType | null },
        ) => {
            if (params.nodeId && params.handleId && params.handleType) {
                connectStartRef.current = {
                    nodeId: params.nodeId,
                    handleId: params.handleId,
                    handleType: params.handleType,
                };
            }
            connectionMadeRef.current = false;
        },
        [],
    );

    const onConnectEnd = useCallback(
        (event: MouseEvent | TouchEvent) => {
            if (connectionMadeRef.current || !connectStartRef.current || !reactFlowInstance) {
                connectStartRef.current = null;
                return;
            }

            const { nodeId, handleId, handleType } = connectStartRef.current;
            connectStartRef.current = null;

            const sourceDef = definitionsMap.get(nodesRef.current.find((n) => n.id === nodeId)?.type ?? "");
            if (!sourceDef) return;

            const ports = handleType === "source" ? sourceDef.output_ports : sourceDef.input_ports;
            const port = (ports ?? []).find((p) => p.name === handleId);
            if (!port) return;

            const bounds = reactFlowWrapper.current?.getBoundingClientRect();
            if (!bounds) return;

            const touch = "changedTouches" in event ? event.changedTouches[0] : undefined;
            const clientX = touch?.clientX ?? (event as MouseEvent).clientX;
            const clientY = touch?.clientY ?? (event as MouseEvent).clientY;

            const flowPosition = reactFlowInstance.screenToFlowPosition({
                x: clientX,
                y: clientY,
            });

            pickerJustOpenedRef.current = true;
            requestAnimationFrame(() => {
                pickerJustOpenedRef.current = false;
            });

            setNodePicker({
                pickerPosition: { x: clientX - bounds.left, y: clientY - bounds.top },
                flowPosition,
                connection: { nodeId, handleId, handleType, portType: port.type },
            });
        },
        [reactFlowInstance, definitionsMap],
    );

    const nodePickerItems = useMemo(() => {
        if (!nodePicker) return [];
        if (!nodePicker.connection) return definitions;
        const { handleType, portType } = nodePicker.connection;
        return definitions.filter((def) => {
            const ports = handleType === "source" ? def.input_ports : def.output_ports;
            return (ports ?? []).some((p) => p.type === portType);
        });
    }, [nodePicker, definitions]);

    const handleNodePickerSelect = useCallback(
        (type: string) => {
            if (!nodePicker) return;

            const newId = nextNodeId();
            const newNode: Node = { id: newId, type, position: nodePicker.flowPosition, data: {} };
            setNodes((nds) => [...nds, newNode]);

            if (nodePicker.connection) {
                const { nodeId, handleId, handleType, portType } = nodePicker.connection;
                const targetDef = definitionsMap.get(type);
                if (targetDef) {
                    const ports = handleType === "source" ? targetDef.input_ports : targetDef.output_ports;
                    const compatiblePort = (ports ?? []).find((p) => p.type === portType);
                    if (compatiblePort) {
                        const sourceType =
                            handleType === "source"
                                ? (nodesRef.current.find((n) => n.id === nodeId)?.type ?? "")
                                : type;
                        const sourceHandle = handleType === "source" ? handleId : compatiblePort.name;
                        const style = getEdgeStyle(sourceType, sourceHandle);
                        const edge =
                            handleType === "source"
                                ? {
                                      source: nodeId,
                                      sourceHandle: handleId,
                                      target: newId,
                                      targetHandle: compatiblePort.name,
                                      style,
                                  }
                                : {
                                      source: newId,
                                      sourceHandle: compatiblePort.name,
                                      target: nodeId,
                                      targetHandle: handleId,
                                      style,
                                  };
                        setEdges((eds) => addEdge(edge, eds));
                    }
                }
            }

            changeCountRef.current++;
            setNodePicker(null);
        },
        [nodePicker, definitionsMap, setNodes, setEdges, getEdgeStyle],
    );

    const pickerJustOpenedRef = useRef(false);

    const dismissNodePicker = useCallback(() => {
        if (pickerJustOpenedRef.current) return;
        setNodePicker(null);
        if (multiSelectActive) exitMultiSelect();
    }, [multiSelectActive, exitMultiSelect]);

    const onPaneContextMenu = useCallback(
        (event: MouseEvent | React.MouseEvent) => {
            event.preventDefault();
            if (!reactFlowInstance) return;

            const bounds = reactFlowWrapper.current?.getBoundingClientRect();
            if (!bounds) return;

            const flowPosition = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            pickerJustOpenedRef.current = true;
            requestAnimationFrame(() => {
                pickerJustOpenedRef.current = false;
            });

            setNodePicker({
                pickerPosition: { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
                flowPosition,
            });
        },
        [reactFlowInstance],
    );

    // Alignment actions for selected nodes
    const handleAlign = useCallback(
        (action: (allNodes: Node[], selectedIds: Set<string>) => Node[]) => {
            const selectedIds = new Set(nodesRef.current.filter((n) => n.selected).map((n) => n.id));
            if (selectedIds.size < 2) return;
            setNodes((nds) => action(nds, selectedIds));
            if (readyRef.current) changeCountRef.current++;
        },
        [setNodes],
    );

    // Double-click on sub-workflow nodes to drill in
    const onNodeDoubleClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            const match = node.type?.match(SUB_WORKFLOW_TYPE_RE);
            if (!match) return;
            const swId = Number.parseInt(match[1], 10);
            const def = definitionsMap.get(node.type ?? "");
            pushBreadcrumb({
                subWorkflowId: swId,
                label: def?.label ?? `Sub-Workflow ${swId}`,
            });
        },
        [definitionsMap, pushBreadcrumb],
    );

    // biome-ignore lint/correctness/useExhaustiveDependencies: nodes and edges trigger the debounced save intentionally
    useEffect(() => {
        if (!readyRef.current) return;
        if (changeCountRef.current === lastSavedCountRef.current) return;

        setSaveStatus("unsaved");
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(flushSave, 1000);

        return () => clearTimeout(saveTimeoutRef.current);
    }, [nodes, edges, flushSave]);

    useEffect(() => {
        return () => {
            clearTimeout(saveTimeoutRef.current);
            flushSave();
        };
    }, [flushSave]);

    if (defsLoading || workflowLoading) {
        return (
            <div className="flex h-full items-center justify-center" ref={reactFlowWrapper}>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="relative h-full touch-none bg-background" ref={reactFlowWrapper}>
            {saveStatus !== "idle" && (
                <div
                    className={`absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-full bg-card/80 backdrop-blur-sm border px-2.5 py-1 shadow-sm transition-opacity duration-300 ${saveStatus === "saved" ? "opacity-80" : ""}`}
                >
                    {saveStatus === "unsaved" && (
                        <Circle className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                    )}
                    {saveStatus === "saving" && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                    {saveStatus === "saved" && <Check className="h-3 w-3 text-emerald-500" />}
                    {saveStatus === "error" && <AlertCircle className="h-3 w-3 text-destructive" />}
                    <span className="text-[11px] font-medium text-muted-foreground">
                        {t(`workflow.${saveStatus}`)}
                    </span>
                </div>
            )}
            <FloatingToolbar className="sm:right-2 gap-1.5">
                <FloatingButton
                    active={edgeDebug}
                    className={edgeDebug ? "bg-primary/20 border-primary/50" : undefined}
                    onClick={toggleEdgeDebug}
                    title={t("workflow.edgeDebug", "Edge debug")}
                >
                    <Bug className={`h-4 w-4 ${edgeDebug ? "text-primary" : "text-muted-foreground"}`} />
                </FloatingButton>
                <FullscreenButton isFullscreen={isFullscreen} onClick={toggleFullscreen} />
            </FloatingToolbar>
            <NodeDefinitionsProvider value={definitionsMap}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={wrappedOnNodesChange}
                    onEdgesChange={wrappedOnEdgesChange}
                    onConnect={wrappedOnConnect}
                    onConnectStart={onConnectStart}
                    onConnectEnd={onConnectEnd}
                    onPaneClick={dismissNodePicker}
                    onPaneContextMenu={onPaneContextMenu}
                    onNodeDoubleClick={onNodeDoubleClick}
                    onInit={setReactFlowInstance as (instance: unknown) => void}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    nodeTypes={nodeTypes}
                    edgeTypes={EDGE_TYPES}
                    isValidConnection={isValidConnection}
                    deleteKeyCode={["Backspace", "Delete"]}
                    minZoom={MIN_ZOOM}
                    maxZoom={MAX_ZOOM}
                    fitView
                    proOptions={{ hideAttribution: true }}
                >
                    <Background gap={20} size={1} />
                    <Controls />
                    <SelectionActions
                        onAlign={handleAlign}
                        multiSelectActive={multiSelectActive}
                        onExitMultiSelect={exitMultiSelect}
                    />
                </ReactFlow>
            </NodeDefinitionsProvider>
            {nodePicker && nodePickerItems.length > 0 && (
                <div
                    ref={(el) => {
                        if (!el) return;
                        const parent = el.offsetParent as HTMLElement | null;
                        if (!parent) return;
                        const pw = parent.clientWidth;
                        const ph = parent.clientHeight;
                        const pad = 8;
                        el.style.left = `${Math.min(nodePicker.pickerPosition.x, Math.max(pad, pw - el.offsetWidth - pad))}px`;
                        el.style.top = `${Math.min(nodePicker.pickerPosition.y, Math.max(pad, ph - el.offsetHeight - pad))}px`;
                    }}
                    className="absolute z-20 w-72 rounded-lg border bg-card shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ left: nodePicker.pickerPosition.x, top: nodePicker.pickerPosition.y }}
                >
                    <div className="max-h-[70vh] overflow-y-auto p-1.5">
                        {nodePickerItems.map((def) => (
                            <button
                                key={def.type}
                                type="button"
                                className="w-full rounded-md px-3 pb-1.5 text-left transition-colors hover:bg-accent"
                                onClick={() => handleNodePickerSelect(def.type)}
                            >
                                <span className="text-xs font-medium">
                                    {t(`workflow.nodes.${def.type}.label`, def.label)}
                                </span>
                                <span className="block text-[10px] text-muted-foreground mt-0.5">
                                    {t(`workflow.nodes.${def.type}.description`, def.description)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <FullscreenPrompt
                open={showPrompt}
                onOpenChange={setShowPrompt}
                onConfirm={() => {
                    setShowPrompt(false);
                    enterFullscreen();
                }}
            />
        </div>
    );
});

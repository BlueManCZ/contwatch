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
import { AlertCircle, Check, Circle, Loader2, Maximize, Minimize, Trash2 } from "lucide-react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { NodeDefinition, WorkflowData } from "@/api/generated/contWatchAPI.schemas";
import {
    getGetWorkflowApiActionsWorkflowGetQueryKey,
    useGetNodeDefinitionsApiActionsWorkflowNodesGet,
    useGetWorkflowApiActionsWorkflowGet,
    useSaveWorkflowApiActionsWorkflowPut,
} from "@/api/generated/workflow/workflow";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { DeletableEdge } from "./deletable-edge";
import { createConnectionValidator } from "./edge-validation";
import { PORT_COLORS } from "./types";
import { createWorkflowNode } from "./workflow-node";

const EMPTY_DEFINITIONS: NodeDefinition[] = [];
const EDGE_TYPES: EdgeTypes = { default: DeletableEdge };

let nodeIdCounter = 0;
function nextNodeId() {
    return `node_${Date.now()}_${nodeIdCounter++}`;
}

function MobileNodeActions() {
    const { t } = useTranslation();
    const { deleteElements } = useReactFlow();
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

    const onChange = useCallback(({ nodes }: { nodes: Node[] }) => {
        setSelectedNodeIds(nodes.map((n) => n.id));
    }, []);

    useOnSelectionChange({ onChange });

    if (selectedNodeIds.length === 0) return null;

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 md:hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
            <button
                type="button"
                className="flex cursor-pointer items-center gap-2 rounded-full border bg-card px-4 py-2.5 shadow-lg active:scale-95 transition-transform"
                onClick={() => {
                    deleteElements({ nodes: selectedNodeIds.map((id) => ({ id })) });
                }}
            >
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">{t("common.delete")}</span>
            </button>
        </div>
    );
}

export interface WorkflowEditorRef {
    addNode: (type: string) => void;
}

export const WorkflowEditor = forwardRef<WorkflowEditorRef>(function WorkflowEditor(_, ref) {
    const { t } = useTranslation();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReturnType<
        typeof import("@xyflow/react").useReactFlow
    > | null>(null);

    const queryClient = useQueryClient();
    const { data: defsResponse } = useGetNodeDefinitionsApiActionsWorkflowNodesGet();
    const { data: workflowResponse } = useGetWorkflowApiActionsWorkflowGet();
    const saveMutation = useSaveWorkflowApiActionsWorkflowPut();

    const [saveStatus, setSaveStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");

    const { isFullscreen, showPrompt, setShowPrompt, toggleFullscreen, enterFullscreen } =
        useFullscreen(reactFlowWrapper);

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
    const savedWorkflow = workflowResponse?.data as WorkflowData | undefined;

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [loaded, setLoaded] = useState(false);

    const nodeTypesRef = useRef<NodeTypes>({});

    const definitionsMap = useMemo(() => {
        const map = new Map<string, NodeDefinition>();
        for (const def of definitions) {
            map.set(def.type, def);
            if (!nodeTypesRef.current[def.type]) {
                nodeTypesRef.current[def.type] = createWorkflowNode(def);
            }
        }
        return map;
    }, [definitions]);

    const nodeTypes = nodeTypesRef.current;

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
            return {
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle ?? undefined,
                targetHandle: e.targetHandle ?? undefined,
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
    const isValidConnection = useMemo(
        () => createConnectionValidator(definitionsMap, getNodes),
        [definitionsMap, getNodes],
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

    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);
    nodesRef.current = nodes;
    edgesRef.current = edges;

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
        saveMutateRef.current(
            { data: workflowData },
            {
                onSuccess: (response) => {
                    queryClient.setQueryData(getGetWorkflowApiActionsWorkflowGetQueryKey(), response);
                },
                onError: (error) => {
                    const axiosError = error as AxiosError<{ detail?: { node_id?: string } }>;
                    const nodeId = axiosError?.response?.data?.detail?.node_id;
                    if (nodeId) {
                        setNodes((nds) =>
                            nds.map((n) =>
                                n.id === nodeId ? { ...n, data: { ...n.data, _error: true } } : n,
                            ),
                        );
                    }
                },
            },
        );
    }, [queryClient, setNodes]);

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
    }, []);

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

    return (
        <div className="relative h-full touch-none -mx-3 sm:-mx-5 bg-background" ref={reactFlowWrapper}>
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
            <button
                type="button"
                className="absolute top-2 right-2 z-10 flex cursor-pointer items-center justify-center rounded-full border bg-card/80 backdrop-blur-sm p-2 shadow-sm"
                onClick={toggleFullscreen}
                title={isFullscreen ? t("common.exitFullscreen") : t("common.enterFullscreen")}
            >
                {isFullscreen ? (
                    <Minimize className="h-4 w-4 text-muted-foreground" />
                ) : (
                    <Maximize className="h-4 w-4 text-muted-foreground" />
                )}
            </button>
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
                onInit={setReactFlowInstance as (instance: unknown) => void}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                edgeTypes={EDGE_TYPES}
                isValidConnection={isValidConnection}
                deleteKeyCode={["Backspace", "Delete"]}
                fitView
                proOptions={{ hideAttribution: true }}
            >
                <Background gap={20} size={1} />
                <Controls />
                <MobileNodeActions />
            </ReactFlow>
            {nodePicker && nodePickerItems.length > 0 && (
                <div
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
            <AlertDialog open={showPrompt} onOpenChange={setShowPrompt}>
                <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("common.fullscreenPromptTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("common.fullscreenPromptDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowPrompt(false);
                                enterFullscreen();
                            }}
                        >
                            {t("common.enterFullscreen")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
});

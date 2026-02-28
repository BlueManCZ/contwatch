import {
    addEdge,
    Background,
    type Connection,
    Controls,
    type Edge,
    MiniMap,
    type Node,
    type NodeTypes,
    ReactFlow,
    useEdgesState,
    useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { NodeDefinition, WorkflowData } from "@/api/generated/contWatchAPI.schemas";
import {
    getGetWorkflowApiActionsWorkflowGetQueryKey,
    useGetNodeDefinitionsApiActionsWorkflowNodesGet,
    useGetWorkflowApiActionsWorkflowGet,
    useSaveWorkflowApiActionsWorkflowPut,
} from "@/api/generated/workflow/workflow";
import { createConnectionValidator } from "./edge-validation";
import { NodePalette } from "./node-palette";
import { createWorkflowNode } from "./workflow-node";

let nodeIdCounter = 0;
function nextNodeId() {
    return `node_${Date.now()}_${nodeIdCounter++}`;
}

export function WorkflowEditor() {
    const { t } = useTranslation();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReturnType<
        typeof import("@xyflow/react").useReactFlow
    > | null>(null);

    const queryClient = useQueryClient();
    const { data: defsResponse } = useGetNodeDefinitionsApiActionsWorkflowNodesGet();
    const { data: workflowResponse } = useGetWorkflowApiActionsWorkflowGet();
    const saveMutation = useSaveWorkflowApiActionsWorkflowPut();

    const definitions = (defsResponse?.data ?? []) as NodeDefinition[];
    const savedWorkflow = workflowResponse?.data as WorkflowData | undefined;

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [loaded, setLoaded] = useState(false);

    // Build definitions map and node types from API definitions
    const { definitionsMap, nodeTypes } = useMemo(() => {
        const map = new Map<string, NodeDefinition>();
        const types: NodeTypes = {};
        for (const def of definitions) {
            map.set(def.type, def);
            types[def.type] = createWorkflowNode(def);
        }
        return { definitionsMap: map, nodeTypes: types };
    }, [definitions]);

    // Load saved workflow once on mount
    useEffect(() => {
        if (loaded || !savedWorkflow || definitions.length === 0) return;

        const loadedNodes: Node[] = (savedWorkflow.nodes ?? []).map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position as { x: number; y: number },
            data: n.data ?? {},
        }));

        const loadedEdges: Edge[] = (savedWorkflow.edges ?? []).map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle ?? undefined,
            targetHandle: e.targetHandle ?? undefined,
        }));

        setNodes(loadedNodes);
        setEdges(loadedEdges);
        setLoaded(true);
    }, [savedWorkflow, definitions, loaded, setNodes, setEdges]);

    // Connection validation
    const getNodes = useCallback(() => nodes, [nodes]);
    const isValidConnection = useMemo(
        () => createConnectionValidator(definitionsMap, getNodes),
        [definitionsMap, getNodes],
    );

    // Add node at position
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

    // Click to add at viewport center
    const handleAddNode = useCallback(
        (type: string) => {
            addNodeAtPosition(type, { x: 250 + Math.random() * 100, y: 150 + Math.random() * 100 });
        },
        [addNodeAtPosition],
    );

    // Drag and drop from palette
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

    // Autosave: only trigger on user-initiated changes (skip the initial load)
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const saveMutateRef = useRef(saveMutation.mutate);
    saveMutateRef.current = saveMutation.mutate;
    const changeCountRef = useRef(0);
    const lastSavedCountRef = useRef(0);

    // Refs to always have the latest state available for save (avoids stale closures)
    const nodesRef = useRef(nodes);
    const edgesRef = useRef(edges);
    nodesRef.current = nodes;
    edgesRef.current = edges;

    // Immediate save using refs — safe to call from timeouts and cleanup
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
            },
        );
    }, [queryClient]);

    // Mark dirty on any user change
    const wrappedOnNodesChange: typeof onNodesChange = useCallback(
        (changes) => {
            onNodesChange(changes);
            if (loaded) changeCountRef.current++;
        },
        [onNodesChange, loaded],
    );

    const wrappedOnEdgesChange: typeof onEdgesChange = useCallback(
        (changes) => {
            onEdgesChange(changes);
            if (loaded) changeCountRef.current++;
        },
        [onEdgesChange, loaded],
    );

    const wrappedOnConnect = useCallback(
        (connection: Connection) => {
            setEdges((eds) => addEdge(connection, eds));
            changeCountRef.current++;
        },
        [setEdges],
    );

    // Debounced save that resets on each change
    // biome-ignore lint/correctness/useExhaustiveDependencies: nodes and edges trigger the debounced save intentionally
    useEffect(() => {
        if (!loaded) return;

        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(flushSave, 1000);

        return () => clearTimeout(saveTimeoutRef.current);
    }, [nodes, edges, loaded, flushSave]);

    // Flush pending save on unmount (e.g. switching tabs)
    useEffect(() => {
        return () => {
            clearTimeout(saveTimeoutRef.current);
            flushSave();
        };
    }, [flushSave]);

    return (
        <div className="flex h-full">
            <NodePalette definitions={definitions} onAddNode={handleAddNode} />
            <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                    <h3 className="text-sm font-medium">{t("workflow.title")}</h3>
                    {saveMutation.isPending && (
                        <span className="text-xs text-muted-foreground">{t("workflow.saving")}</span>
                    )}
                </div>
                <div className="flex-1" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={wrappedOnNodesChange}
                        onEdgesChange={wrappedOnEdgesChange}
                        onConnect={wrappedOnConnect}
                        onInit={setReactFlowInstance as (instance: unknown) => void}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        nodeTypes={nodeTypes}
                        isValidConnection={isValidConnection}
                        fitView
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background />
                        <Controls />
                        <MiniMap />
                    </ReactFlow>
                </div>
            </div>
        </div>
    );
}

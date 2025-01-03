"use client";

import { Text } from "@repo/ui/Text";
import { useTranslation } from "@repo/utils/useTranslation";

import {
    addEdge,
    Background,
    BackgroundVariant,
    Controls,
    Edge,
    MiniMap,
    Node,
    Position,
    ReactFlow,
    useEdgesState,
    useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
// import "@xyflow/react/dist/base.css";
import { useCallback, useEffect } from "react";
import { Connection } from "@xyflow/system";

export default function Actions() {
    // TODO: Use SSR translation and remove "use client"
    const { t } = useTranslation();

    const firstTitle = t("New action editor");
    const secondTitle = t("is currently in development");

    const initialNodes: Node[] = [
        {
            id: "1",
            type: "input",
            position: { x: 0, y: 0 },
            data: { label: firstTitle },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
        },
        {
            id: "2",
            type: "output",
            position: { x: 200, y: 50 },
            data: { label: secondTitle },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
        },
    ];

    const initialEdges: Edge[] = [
        {
            id: "e1-2",
            source: "1",
            target: "2",
        },
    ];

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    useEffect(() => {
        setNodes((nodes) =>
            nodes.map((node) => {
                if (node.id === "1") {
                    return { ...node, data: { ...node.data, label: firstTitle } };
                } else if (node.id === "2") {
                    return { ...node, data: { ...node.data, label: secondTitle } };
                }
                return node;
            }),
        );
    }, [firstTitle, secondTitle, setNodes]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    return (
        <>
            <Text size={"medium"} weight={"bold"}>
                {t("Actions")}
            </Text>
            <div style={{ height: "100%" }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView={true}
                    // colorMode={"system"}
                >
                    <Controls />
                    <MiniMap />
                    <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                </ReactFlow>
            </div>
        </>
    );
}

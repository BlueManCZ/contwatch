import type { Edge, Node } from "@xyflow/react";
import { useCallback, useEffect, useRef } from "react";

interface ClipboardData {
    nodes: Node[];
    edges: Edge[];
}

interface UndoSnapshot {
    nodes: Node[];
    edges: Edge[];
}

const PASTE_CASCADE_OFFSET = 50;
const MAX_UNDO_STACK = 50;

let nodeIdCounter = 0;
function nextPasteId() {
    return `paste_${Date.now()}_${nodeIdCounter++}`;
}

// Module-level clipboard so it persists across sub-workflow navigation
let sharedClipboard: ClipboardData | null = null;
let sharedPastePosition: { x: number; y: number } | null = null;
let sharedPasteCount = 0;

/**
 * Provides Ctrl+X/C/V (cut/copy/paste) and Ctrl+Z (undo) for the workflow editor.
 */
export function useWorkflowClipboard({
    nodesRef,
    edgesRef,
    setNodes,
    setEdges,
    readyRef,
    changeCountRef,
    containerRef,
}: {
    nodesRef: React.RefObject<Node[]>;
    edgesRef: React.RefObject<Edge[]>;
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
    readyRef: React.RefObject<boolean>;
    changeCountRef: React.MutableRefObject<number>;
    containerRef: React.RefObject<HTMLDivElement | null>;
}) {
    const undoStackRef = useRef<UndoSnapshot[]>([]);

    const setPastePosition = useCallback((pos: { x: number; y: number }) => {
        sharedPastePosition = pos;
        sharedPasteCount = 0;
    }, []);

    const takeSnapshot = useCallback((): UndoSnapshot => {
        return {
            nodes: nodesRef.current.map((n) => ({ ...n, data: { ...n.data } })),
            edges: edgesRef.current.map((e) => ({ ...e })),
        };
    }, [nodesRef, edgesRef]);

    const pushUndo = useCallback(() => {
        const snapshot = takeSnapshot();
        undoStackRef.current.push(snapshot);
        if (undoStackRef.current.length > MAX_UNDO_STACK) {
            undoStackRef.current.shift();
        }
    }, [takeSnapshot]);

    const copySelected = useCallback(() => {
        const nodes = nodesRef.current;
        const edges = edgesRef.current;
        const selectedNodes = nodes.filter((n) => n.selected);
        if (selectedNodes.length === 0) return;

        const selectedIds = new Set(selectedNodes.map((n) => n.id));
        const internalEdges = edges.filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target));

        sharedClipboard = { nodes: selectedNodes, edges: internalEdges };
        sharedPastePosition = null;
        sharedPasteCount = 0;
    }, [nodesRef, edgesRef]);

    const cutSelected = useCallback(() => {
        const selectedNodes = nodesRef.current.filter((n) => n.selected);
        if (selectedNodes.length === 0) return;

        pushUndo();
        copySelected();

        const cutIds = new Set(selectedNodes.map((n) => n.id));
        setNodes((nds) => nds.filter((n) => !cutIds.has(n.id)));
        setEdges((eds) => eds.filter((e) => !cutIds.has(e.source) && !cutIds.has(e.target)));
        if (readyRef.current) changeCountRef.current++;
    }, [nodesRef, pushUndo, copySelected, setNodes, setEdges, readyRef, changeCountRef]);

    const paste = useCallback(() => {
        if (!sharedClipboard || sharedClipboard.nodes.length === 0) return;

        pushUndo();
        const cascadeOffset = PASTE_CASCADE_OFFSET * sharedPasteCount;
        sharedPasteCount++;

        // Compute the center of the copied nodes
        const copied = sharedClipboard.nodes;
        const centerX = copied.reduce((sum, n) => sum + n.position.x, 0) / copied.length;
        const centerY = copied.reduce((sum, n) => sum + n.position.y, 0) / copied.length;

        // If a paste position was set (pane click), place relative to it; otherwise offset from original
        const target = sharedPastePosition;
        const dx = target ? target.x - centerX + cascadeOffset : cascadeOffset + PASTE_CASCADE_OFFSET;
        const dy = target ? target.y - centerY + cascadeOffset : cascadeOffset + PASTE_CASCADE_OFFSET;

        const idMap = new Map<string, string>();
        const newNodes: Node[] = copied.map((n) => {
            const newId = nextPasteId();
            idMap.set(n.id, newId);
            return {
                ...n,
                id: newId,
                position: { x: n.position.x + dx, y: n.position.y + dy },
                selected: true,
                data: { ...n.data },
            };
        });

        const newEdges: Edge[] = sharedClipboard.edges.map((e) => ({
            ...e,
            id: nextPasteId(),
            source: idMap.get(e.source) ?? e.source,
            target: idMap.get(e.target) ?? e.target,
        }));

        // Deselect existing nodes, add new ones selected
        setNodes((nds) => [...nds.map((n) => (n.selected ? { ...n, selected: false } : n)), ...newNodes]);
        setEdges((eds) => [...eds, ...newEdges]);
        if (readyRef.current) changeCountRef.current++;
    }, [pushUndo, setNodes, setEdges, readyRef, changeCountRef]);

    const undo = useCallback(() => {
        const snapshot = undoStackRef.current.pop();
        if (!snapshot) return;

        setNodes(snapshot.nodes);
        setEdges(snapshot.edges);
        if (readyRef.current) changeCountRef.current++;
    }, [setNodes, setEdges, readyRef, changeCountRef]);

    // Keyboard handler — listen on document, but only act when focus is inside the editor
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const container = containerRef.current;
            if (!container) return;
            if (!container.contains(e.target as HTMLElement)) return;

            // Ignore if typing in an input/textarea/select
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if ((e.target as HTMLElement)?.isContentEditable) return;

            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;

            switch (e.key.toLowerCase()) {
                case "c":
                    e.preventDefault();
                    copySelected();
                    break;
                case "x":
                    e.preventDefault();
                    cutSelected();
                    break;
                case "v":
                    e.preventDefault();
                    paste();
                    break;
                case "z":
                    e.preventDefault();
                    undo();
                    break;
            }
        }

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [containerRef, copySelected, cutSelected, paste, undo]);

    return { pushUndo, setPastePosition };
}

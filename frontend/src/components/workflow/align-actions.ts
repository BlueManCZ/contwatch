import type { Node } from "@xyflow/react";

const GAP = 20;

type Position = { x: number; y: number };

interface MeasuredNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

function measure(nodes: Node[]): MeasuredNode[] {
    return nodes.map((n) => ({
        id: n.id,
        x: n.position.x,
        y: n.position.y,
        width: n.measured?.width ?? 180,
        height: n.measured?.height ?? 80,
    }));
}

function applyPositions(allNodes: Node[], updates: Map<string, Position>): Node[] {
    return allNodes.map((n) => {
        const pos = updates.get(n.id);
        return pos ? { ...n, position: pos } : n;
    });
}

export function alignLeft(allNodes: Node[], selectedIds: Set<string>): Node[] {
    const selected = measure(allNodes.filter((n) => selectedIds.has(n.id)));
    if (selected.length < 2) return allNodes;
    const minX = Math.min(...selected.map((n) => n.x));
    const updates = new Map<string, Position>();
    for (const n of selected) updates.set(n.id, { x: minX, y: n.y });
    return applyPositions(allNodes, updates);
}

export function alignRight(allNodes: Node[], selectedIds: Set<string>): Node[] {
    const selected = measure(allNodes.filter((n) => selectedIds.has(n.id)));
    if (selected.length < 2) return allNodes;
    const maxRight = Math.max(...selected.map((n) => n.x + n.width));
    const updates = new Map<string, Position>();
    for (const n of selected) updates.set(n.id, { x: maxRight - n.width, y: n.y });
    return applyPositions(allNodes, updates);
}

export function alignTop(allNodes: Node[], selectedIds: Set<string>): Node[] {
    const selected = measure(allNodes.filter((n) => selectedIds.has(n.id)));
    if (selected.length < 2) return allNodes;
    const minY = Math.min(...selected.map((n) => n.y));
    const updates = new Map<string, Position>();
    for (const n of selected) updates.set(n.id, { x: n.x, y: minY });
    return applyPositions(allNodes, updates);
}

export function alignBottom(allNodes: Node[], selectedIds: Set<string>): Node[] {
    const selected = measure(allNodes.filter((n) => selectedIds.has(n.id)));
    if (selected.length < 2) return allNodes;
    const maxBottom = Math.max(...selected.map((n) => n.y + n.height));
    const updates = new Map<string, Position>();
    for (const n of selected) updates.set(n.id, { x: n.x, y: maxBottom - n.height });
    return applyPositions(allNodes, updates);
}

export function distributeHorizontally(allNodes: Node[], selectedIds: Set<string>): Node[] {
    const selected = measure(allNodes.filter((n) => selectedIds.has(n.id)));
    if (selected.length < 3) return allNodes;
    selected.sort((a, b) => a.x - b.x);
    const totalWidth = selected.reduce((sum, n) => sum + n.width, 0);
    const minX = selected[0].x;
    const maxRight = selected[selected.length - 1].x + selected[selected.length - 1].width;
    const availableSpace = maxRight - minX - totalWidth;
    const gap = availableSpace / (selected.length - 1);
    const updates = new Map<string, Position>();
    let currentX = minX;
    for (const n of selected) {
        updates.set(n.id, { x: currentX, y: n.y });
        currentX += n.width + gap;
    }
    return applyPositions(allNodes, updates);
}

export function distributeVertically(allNodes: Node[], selectedIds: Set<string>): Node[] {
    const selected = measure(allNodes.filter((n) => selectedIds.has(n.id)));
    if (selected.length < 3) return allNodes;
    selected.sort((a, b) => a.y - b.y);
    const totalHeight = selected.reduce((sum, n) => sum + n.height, 0);
    const minY = selected[0].y;
    const maxBottom = selected[selected.length - 1].y + selected[selected.length - 1].height;
    const availableSpace = maxBottom - minY - totalHeight;
    const gap = availableSpace / (selected.length - 1);
    const updates = new Map<string, Position>();
    let currentY = minY;
    for (const n of selected) {
        updates.set(n.id, { x: n.x, y: currentY });
        currentY += n.height + gap;
    }
    return applyPositions(allNodes, updates);
}

/**
 * Detect the number of columns from existing node positions by clustering
 * x-coordinates. Nodes whose x-centers are within one node-width of each
 * other are considered part of the same column.
 */
function detectColumns(nodes: MeasuredNode[]): number {
    const maxWidth = Math.max(...nodes.map((n) => n.width));
    const centers = nodes.map((n) => n.x + n.width / 2).sort((a, b) => a - b);
    let cols = 1;
    let clusterCenter = centers[0];
    for (let i = 1; i < centers.length; i++) {
        if (centers[i] - clusterCenter > maxWidth) {
            cols++;
            clusterCenter = centers[i];
        }
    }
    return cols;
}

export function arrangeGrid(allNodes: Node[], selectedIds: Set<string>): Node[] {
    const selected = measure(allNodes.filter((n) => selectedIds.has(n.id)));
    if (selected.length < 2) return allNodes;

    // Detect column count from the existing layout
    const cols = detectColumns(selected);
    const maxWidth = Math.max(...selected.map((n) => n.width));
    const maxHeight = Math.max(...selected.map((n) => n.height));

    // Start from the top-left corner of the bounding box
    const startX = Math.min(...selected.map((n) => n.x));
    const startY = Math.min(...selected.map((n) => n.y));

    // Sort by current position (top-to-bottom, left-to-right) to preserve rough order
    selected.sort((a, b) => {
        const rowA = Math.round(a.y / (maxHeight + GAP));
        const rowB = Math.round(b.y / (maxHeight + GAP));
        if (rowA !== rowB) return rowA - rowB;
        return a.x - b.x;
    });

    const updates = new Map<string, Position>();
    for (let i = 0; i < selected.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        updates.set(selected[i].id, {
            x: startX + col * (maxWidth + GAP),
            y: startY + row * (maxHeight + GAP),
        });
    }
    return applyPositions(allNodes, updates);
}

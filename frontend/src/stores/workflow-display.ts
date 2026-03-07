import { create } from "zustand";

export interface DisplayValue {
    value: string;
    type: string;
}

export type EdgeKey = `${string}:${string}:${string}:${string}`;

export function edgeKey(source: string, sourceHandle: string, target: string, targetHandle: string): EdgeKey {
    return `${source}:${sourceHandle}:${target}:${targetHandle}`;
}

interface WorkflowDisplayState {
    values: Record<string, DisplayValue>;
    edgeValues: Record<EdgeKey, DisplayValue>;
    edgeDebug: boolean;
    set: (nodeId: string, data: DisplayValue) => void;
    setEdgeValue: (key: EdgeKey, data: DisplayValue) => void;
    setEdgeDebug: (enabled: boolean) => void;
}

export const useWorkflowDisplayStore = create<WorkflowDisplayState>()((set) => ({
    values: {},
    edgeValues: {},
    edgeDebug: false,
    set: (nodeId, data) =>
        set((state) => ({
            values: { ...state.values, [nodeId]: data },
        })),
    setEdgeValue: (key, data) =>
        set((state) => ({
            edgeValues: { ...state.edgeValues, [key]: data },
        })),
    setEdgeDebug: (enabled) => set({ edgeDebug: enabled }),
}));

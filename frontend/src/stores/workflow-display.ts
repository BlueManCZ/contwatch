import { create } from "zustand";

export interface DisplayValue {
    value: string;
    type: string;
}

export type EdgeKey = `${string}:${string}:${string}:${string}`;

export function edgeKey(source: string, sourceHandle: string, target: string, targetHandle: string): EdgeKey {
    return `${source}:${sourceHandle}:${target}:${targetHandle}`;
}

export interface BreadcrumbEntry {
    subWorkflowId: number | null; // null = main workflow
    label: string;
}

interface WorkflowDisplayState {
    values: Record<string, DisplayValue>;
    edgeValues: Record<EdgeKey, DisplayValue>;
    edgeDebug: boolean;
    breadcrumbs: BreadcrumbEntry[];
    set: (nodeId: string, data: DisplayValue) => void;
    setEdgeValue: (key: EdgeKey, data: DisplayValue) => void;
    setEdgeDebug: (enabled: boolean) => void;
    pushBreadcrumb: (entry: BreadcrumbEntry) => void;
    popToBreadcrumb: (index: number) => void;
}

export const useWorkflowDisplayStore = create<WorkflowDisplayState>()((set) => ({
    values: {},
    edgeValues: {},
    edgeDebug: false,
    breadcrumbs: [{ subWorkflowId: null, label: "Main Workflow" }],
    set: (nodeId, data) =>
        set((state) => ({
            values: { ...state.values, [nodeId]: data },
        })),
    setEdgeValue: (key, data) =>
        set((state) => ({
            edgeValues: { ...state.edgeValues, [key]: data },
        })),
    setEdgeDebug: (enabled) => set({ edgeDebug: enabled }),
    pushBreadcrumb: (entry) =>
        set((state) => {
            // Don't push if already at this sub-workflow
            const current = state.breadcrumbs[state.breadcrumbs.length - 1];
            if (current?.subWorkflowId === entry.subWorkflowId) return state;
            return { breadcrumbs: [...state.breadcrumbs, entry] };
        }),
    popToBreadcrumb: (index) =>
        set((state) => ({
            breadcrumbs: state.breadcrumbs.slice(0, index + 1),
        })),
}));

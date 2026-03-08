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

function syncSwToUrl(breadcrumbs: BreadcrumbEntry[]) {
    const swId = breadcrumbs[breadcrumbs.length - 1]?.subWorkflowId;
    const url = new URL(window.location.href);
    if (swId != null) {
        url.searchParams.set("sw", String(swId));
    } else {
        url.searchParams.delete("sw");
    }
    window.history.replaceState(window.history.state, "", url);
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
    openSubWorkflow: (entry: BreadcrumbEntry) => void;
}

export const useWorkflowStore = create<WorkflowDisplayState>()((set) => ({
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
            const current = state.breadcrumbs[state.breadcrumbs.length - 1];
            if (current?.subWorkflowId === entry.subWorkflowId) return state;
            const breadcrumbs = [...state.breadcrumbs, entry];
            syncSwToUrl(breadcrumbs);
            return { breadcrumbs };
        }),
    popToBreadcrumb: (index) =>
        set((state) => {
            const breadcrumbs = state.breadcrumbs.slice(0, index + 1);
            syncSwToUrl(breadcrumbs);
            return { breadcrumbs };
        }),
    openSubWorkflow: (entry) =>
        set((state) => {
            const breadcrumbs = [state.breadcrumbs[0], entry];
            syncSwToUrl(breadcrumbs);
            return { breadcrumbs };
        }),
}));

import { create } from "zustand";

interface HandlerStatus {
    running: boolean;
    connected: boolean;
    last_active?: string | null;
}

interface HandlerStatusState {
    statuses: Record<number, HandlerStatus>;
    setStatus: (handlerId: number, status: HandlerStatus) => void;
    bulkSetStatuses: (statuses: Record<number, HandlerStatus>) => void;
}

export const useHandlerStatusStore = create<HandlerStatusState>()((set) => ({
    statuses: {},
    setStatus: (handlerId, status) =>
        set((state) => ({
            statuses: { ...state.statuses, [handlerId]: status },
        })),
    bulkSetStatuses: (statuses) =>
        set((state) => ({
            statuses: { ...state.statuses, ...statuses },
        })),
}));

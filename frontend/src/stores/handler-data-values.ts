import { create } from "zustand";

export interface HandlerDataValue {
    handler_id: number;
    key: string;
    value: unknown;
    last_changed: string | null;
}

interface HandlerDataValuesState {
    /** Keyed by "handler_id:key" */
    values: Record<string, HandlerDataValue>;
    set: (data: HandlerDataValue) => void;
}

function makeKey(handlerId: number, key: string) {
    return `${handlerId}:${key}`;
}

export const useHandlerDataValuesStore = create<HandlerDataValuesState>()((set) => ({
    values: {},
    set: (data) =>
        set((state) => ({
            values: { ...state.values, [makeKey(data.handler_id, data.key)]: data },
        })),
}));

export function getHandlerDataValue(
    handlerId: number | null | undefined,
    key: string | null | undefined,
): HandlerDataValue | undefined {
    if (!handlerId || !key) return undefined;
    return useHandlerDataValuesStore.getState().values[makeKey(handlerId, key)];
}

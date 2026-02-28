import { create } from "zustand";
import type { AttributeValue } from "@/api/generated/contWatchAPI.schemas";

interface LiveValuesState {
    values: Record<number, AttributeValue>;
    setAttributeValue: (attrValue: AttributeValue) => void;
    bulkSetValues: (attrValues: AttributeValue[]) => void;
}

export const useLiveValuesStore = create<LiveValuesState>()((set) => ({
    values: {},
    setAttributeValue: (attrValue) =>
        set((state) => ({
            values: { ...state.values, [attrValue.attribute_id]: attrValue },
        })),
    bulkSetValues: (attrValues) =>
        set((state) => {
            const updated = { ...state.values };
            for (const av of attrValues) {
                updated[av.attribute_id] = av;
            }
            return { values: updated };
        }),
}));

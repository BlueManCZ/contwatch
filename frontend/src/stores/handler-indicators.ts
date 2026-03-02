import { create } from "zustand";

export interface Indicator {
    icon: string;
    color: string;
    tooltip: string;
}

interface HandlerIndicatorState {
    indicators: Record<number, Indicator[]>;
    setIndicators: (handlerId: number, indicators: Indicator[]) => void;
}

export const useHandlerIndicatorStore = create<HandlerIndicatorState>()((set) => ({
    indicators: {},
    setIndicators: (handlerId, indicators) =>
        set((state) => ({
            indicators: { ...state.indicators, [handlerId]: indicators },
        })),
}));

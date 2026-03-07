import { create } from "zustand";

export interface Indicator {
    icon: string;
    color: string;
    tooltip_key: string;
    tooltip_params?: Record<string, string> | null;
}

export const INDICATOR_COLOR: Record<string, string> = {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive-foreground",
    muted: "text-muted-foreground",
};

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

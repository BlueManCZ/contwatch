import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
    locale: string;
    setLocale: (locale: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            locale: "en",
            setLocale: (locale) => set({ locale }),
        }),
        { name: "contwatch-settings" },
    ),
);

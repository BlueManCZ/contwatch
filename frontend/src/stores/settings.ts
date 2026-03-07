import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface SettingsState {
    locale: string;
    theme: Theme;
    setLocale: (locale: string) => void;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            locale: "auto",
            theme: "dark",
            setLocale: (locale) => set({ locale }),
            setTheme: (theme) => set({ theme }),
            toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
        }),
        { name: "contwatch-settings" },
    ),
);

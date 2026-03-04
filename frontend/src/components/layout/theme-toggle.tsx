import { Moon, Sun } from "lucide-react";
import { useSettingsStore } from "@/stores/settings";

export function ThemeToggle() {
    const { theme, toggleTheme } = useSettingsStore();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent cursor-pointer transition-colors"
        >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
    );
}

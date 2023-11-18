export enum LOCALES {
    en_US = "en-US",
    cs_CZ = "cs-CZ",
}

export enum LOCALE_NAMES {
    "en-US" = "English",
    "cs-CZ" = "Čeština",
}

export const enum LOC_KEY {
    LOGIN = "login",
    LOGOUT = "logout",
    DASHBOARD = "dashboard",
    HANDLERS = "handlers",
    INSPECTOR = "inspector",
    DASHBOARD_INFO = "dashboardInfo",
    INSPECTOR_INFO = "inspectorInfo",
    SETTINGS = "settings",
}

export const LOC_KEY_DATABASE: Record<LOC_KEY, Record<string, string>> = {
    login: {
        "en-US": "Login",
        "cs-CZ": "Přihlásit",
    },
    logout: {
        "en-US": "Logout",
        "cs-CZ": "Odhlásit",
    },
    dashboard: {
        "en-US": "Dashboard",
        "cs-CZ": "Přehled",
    },
    handlers: {
        "en-US": "Handlers",
        "cs-CZ": "Zařízení",
    },
    inspector: {
        "en-US": "Inspector",
        "cs-CZ": "Průzkumník",
    },
    dashboardInfo: {
        "en-US": "All important information in one place",
        "cs-CZ": "Všechny důležité informace na jednom místě",
    },
    inspectorInfo: {
        "en-US": "Advanced data and visualizations",
        "cs-CZ": "Podrobnější data a vizualizace",
    },
    settings: {
        "en-US": "Settings",
        "cs-CZ": "Nastavení",
    },
};

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
    INSPECTOR = "inspector",
    HANDLERS = "handlers",
    ACTIONS = "actions",
    SETTINGS = "settings",
    DASHBOARD_INFO = "dashboardInfo",
    INSPECTOR_INFO = "inspectorInfo",
    HANDLERS_INFO = "handlersInfo",
    ACTIONS_INFO = "actionsInfo",
    HANDLERS_DESCRIPTION = "handlersDescription",
    SETTINGS_INFO = "settingsInfo",
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
    inspector: {
        "en-US": "Inspector",
        "cs-CZ": "Průzkumník",
    },
    handlers: {
        "en-US": "Handlers",
        "cs-CZ": "Zařízení",
    },
    actions: {
        "en-US": "Actions",
        "cs-CZ": "Akce",
    },
    settings: {
        "en-US": "Settings",
        "cs-CZ": "Nastavení",
    },
    dashboardInfo: {
        "en-US": "All important information in one place",
        "cs-CZ": "Všechny důležité informace na jednom místě",
    },
    inspectorInfo: {
        "en-US": "Advanced data and visualizations",
        "cs-CZ": "Podrobná data a vizualizace",
    },
    handlersInfo: {
        "en-US": "Manage your devices",
        "cs-CZ": "Spravujte svá zařízení",
    },
    actionsInfo: {
        "en-US": "Setup custom rules and actions",
        "cs-CZ": "Nastavte si vlastní pravidla a akce",
    },
    settingsInfo: {
        "en-US": "Manage ContWatch configuration",
        "cs-CZ": "Spravujte nastavení ContWatch",
    },
    handlersDescription: {
        "en-US": "Your configured devices",
        "cs-CZ": "Vaše nakonfigurovaná zařízení",
    },
};

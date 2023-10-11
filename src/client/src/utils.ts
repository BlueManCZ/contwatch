import { KeyboardEvent, KeyboardEventHandler, WheelEvent, WheelEventHandler } from "react";

import { Key } from "./types";

export const bemClassNames = (blockClassName: string) => {
    return (classNameOrModifiers: string | Object = "", modifiers: Object = {}) => {
        let elementClassName;
        if (typeof classNameOrModifiers === "object") {
            modifiers = classNameOrModifiers;
            elementClassName = "";
        } else {
            elementClassName = classNameOrModifiers;
        }
        let className = blockClassName;
        if (elementClassName) {
            className += "__" + elementClassName;
        }
        let resultClassNames = className;
        for (const modifier of Object.keys(modifiers)) {
            const key = modifier as keyof typeof modifiers;
            if (!modifiers[key]) {
                continue;
            }
            let newClassName = "";
            if (typeof modifiers[key] === "boolean") {
                if (modifiers[key] as unknown as boolean) {
                    newClassName = `${className}--${modifier}`;
                }
            } else if (typeof modifiers[key] === "string") {
                newClassName = `${className}--${modifier}-${modifiers[key]}`;
            } else {
                newClassName = `${className}--${modifier}`;
            }
            if (newClassName) {
                resultClassNames += " " + newClassName;
            }
        }
        return resultClassNames;
    };
};

export const capitalize = (word: string) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
};

export const wheelHandler = (onScrollUp?: WheelEventHandler, onScrollDown?: WheelEventHandler) => {
    return (e: WheelEvent) => {
        if (e.deltaY < 0) {
            return onScrollUp?.(e);
        } else {
            return onScrollDown?.(e);
        }
    };
};

export const arrowHandler = (onArrowUp?: KeyboardEventHandler, onArrowDown?: KeyboardEventHandler) => {
    return (e: KeyboardEvent) => {
        switch (e.code) {
            case Key.ArrowUp:
                return onArrowUp?.(e);
            case Key.ArrowDown:
                return onArrowDown?.(e);
        }
    };
};

export const locDatabase: Record<number, Record<string, string>> = {
    1: {
        "en-US": "Login",
        "cs-CZ": "Přihlásit",
    },
    2: {
        "en-US": "Logout",
        "cs-CZ": "Odhlásit",
    },
    3: {
        "en-US": "Dashboard",
        "cs-CZ": "Přehled",
    },
    4: {
        "en-US": "Handlers",
        "cs-CZ": "Zařízení",
    },
    5: {
        "en-US": "Inspector",
        "cs-CZ": "Průzkumník",
    },
    6: {
        "en-US": "Settings",
        "cs-CZ": "Nastavení",
    },
    7: {
        "en-US": "Welcome",
        "cs-CZ": "Vítejte",
    },
    8: {
        "en-US": "Sign in to continue",
        "cs-CZ": "Pro pokračování se přihlaste",
    },
    9: {
        "en-US": "Name",
        "cs-CZ": "Jméno",
    },
    10: {
        "en-US": "Username",
        "cs-CZ": "Uživatel",
    },
    11: {
        "en-US": "Email",
        "cs-CZ": "E-mail",
    },
    12: {
        "en-US": "Password",
        "cs-CZ": "Heslo",
    },
    13: {
        "en-US": "Don't have an account?",
        "cs-CZ": "Nemáte účet?",
    },
    14: {
        "en-US": "Create one.",
        "cs-CZ": "Vytvořte si ho.",
    },
    15: {
        "en-US": "Create new account",
        "cs-CZ": "Vytvořte si nový účet",
    },
    16: {
        "en-US": "Register",
        "cs-CZ": "Registrovat",
    },
    17: {
        "en-US": "Already have an account?",
        "cs-CZ": "Máte účet?",
    },
    18: {
        "en-US": "Sign in.",
        "cs-CZ": "Přihlaste se.",
    },
    19: {
        "en-US": "Product name",
        "cs-CZ": "Název produktu",
    },
    20: {
        "en-US": "Search products",
        "cs-CZ": "Vyhledat produkt",
    },
    21: {
        "en-US": "Product price",
        "cs-CZ": "Cena produktu",
    },
    22: {
        "en-US": "Category",
        "cs-CZ": "Kategorie",
    },
    23: {
        "en-US": "Vendor",
        "cs-CZ": "Prodejce",
    },
    24: {
        "en-US": "Expense date",
        "cs-CZ": "Datum nákupu",
    },
    25: {
        "en-US": "Share selected items with",
        "cs-CZ": "Sdílet označené položky s",
    },
    26: {
        "en-US": "Household name",
        "cs-CZ": "Jméno domácnosti",
    },
};

export const enum GLOBAL_LOC_KEYS {
    LOGIN = 1,
    LOGOUT,
    DASHBOARD,
    HANDLERS,
    INSPECTOR,
    SETTINGS,
    WELCOME,
    NAME = 9,
    USERNAME,
    EMAIL,
    PASSWORD,
    DONT_HAVE_AN_ACCOUNT,
    CREATE_ONE,
    PRODUCT_NAME = 19,
    PRODUCT_PRICE = 21,
    CATEGORY,
}

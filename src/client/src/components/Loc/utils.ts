import { locDatabase } from "../../utils";

export const getLocale = () => {
    let locale = navigator.language;
    if (locale === "cs") {
        locale += "-CZ";
    }
    return locale;
};

export enum supportedLocales {
    en_US = "en-US",
    cs_CZ = "cs-CZ",
}

export enum localeNames {
    "en-US" = "English",
    "cs-CZ" = "Čeština",
}

export const translate = (locKey: number, locale?: supportedLocales) => {
    const targetLocale = locale ?? getLocale();
    const loadedTranslation = locDatabase[locKey];
    if (loadedTranslation) {
        return loadedTranslation[targetLocale] ?? loadedTranslation["en-US"];
    } else {
        return "???";
    }
};

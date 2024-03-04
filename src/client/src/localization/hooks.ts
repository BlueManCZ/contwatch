import { useSelector } from "react-redux";

import { selectLocaleState } from "../store/settingsSlice";
import { LOC_KEY, LOC_KEY_DATABASE, LOCALES } from "./database";

export const useLocalization = () => {
    const currentLocale = useSelector(selectLocaleState);

    /**
     * Translate a LOC_KEY to a string in the current or specified locale.
     * @param locKey The LOC_KEY to translate.
     * @param locale The locale to translate to. Defaults to the current locale.
     */
    const localize = (locKey: LOC_KEY, locale?: LOCALES) => {
        const targetLocale = locale ?? currentLocale;
        const loadedTranslation = LOC_KEY_DATABASE[locKey];
        if (loadedTranslation) {
            return loadedTranslation[targetLocale] ?? loadedTranslation["en-US"];
        } else {
            return locKey;
        }
    };

    return {
        localize,
    };
};

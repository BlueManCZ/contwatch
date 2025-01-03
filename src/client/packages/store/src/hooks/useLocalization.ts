import { useSelector } from "react-redux";

import { selectLocaleState } from "../slices/settingsSlice";

export enum LOCALES {
    en_US = "en-US",
    cs_CZ = "cs-CZ",
}

export const useLocalization = () => {
    const currentLocale = useSelector(selectLocaleState);

    /**
     * Localize a number or string to the current or specified locale.
     * @param value The value to localize.
     * @param locale The locale to localize to. Defaults to the current locale.
     */
    const localizeValue = (value: string | number, locale?: LOCALES) => {
        const targetLocale = locale ?? currentLocale;
        return value.toLocaleString(targetLocale);
    };

    /**
     * Localize a date to the current or specified locale.
     * @param date The date to localize.
     * @param locale The locale to localize to. Defaults to the current locale.
     */
    const localizeDate = (date: Date, locale?: LOCALES) => {
        const targetLocale = locale ?? currentLocale;
        return date.toLocaleDateString(targetLocale);
    };

    /**
     * Localize a number to a currency in the current or specified locale.
     * @param value The value to localize.
     * @param currency The currency to localize to.
     * @param locale The locale to localize to. Defaults to the current locale.
     */
    const localizeCurrency = (value: number = NaN, currency: string = "CZK", locale?: LOCALES) => {
        const result = new Intl.NumberFormat(locale ?? currentLocale, {
            style: "currency",
            currency,
            // @ts-ignore
            trailingZeroDisplay: "stripIfInteger",
        }).format(value);
        if (Number.isNaN(value)) {
            return result.replace("NaN", "");
        }
        return result;
    };

    return {
        localizeValue,
        localizeDate,
        localizeCurrency,
    };
};

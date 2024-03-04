import { FC, useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";

import { setLocaleState } from "./settingsSlice";

export type StoreInitProps = {};

export const StoreInit: FC<StoreInitProps> = ({}) => {
    const dispatch = useDispatch();

    /**
     * Get the current locale. Uses the browser's locale if available, otherwise defaults to en-US.
     * This is used only for state initialization. Use redux selector "selectLocaleState" to get the current locale.
     */
    const getLocale = useCallback(() => {
        let locale = "en-US";
        if (navigator) {
            locale = navigator.language;
        }
        if (locale === "cs") {
            locale += "-CZ";
        }
        return locale;
    }, []);

    useEffect(() => {
        dispatch(setLocaleState(getLocale()));
    }, [dispatch, getLocale]);

    return <></>;
};

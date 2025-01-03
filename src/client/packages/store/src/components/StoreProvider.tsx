"use client";

import { FC, PropsWithChildren, useCallback, useRef } from "react";
import { Provider } from "react-redux";

import { setLocaleState } from "../slices/settingsSlice";
import { AppStore, makeStore } from "../store";

type StoreProviderProps = PropsWithChildren<{
    lang?: string;
}>;

export const StoreProvider: FC<StoreProviderProps> = ({ lang, children }) => {
    /**
     * Get the current locale. Uses the browser's locale if available, otherwise defaults to en-US.
     * This is used only for state initialization. Use redux selector "selectLocaleState" to get the current locale.
     */
    const getLocale = useCallback(() => {
        let locale = "en";
        if (navigator) {
            locale = navigator.language;
        }
        return locale;
    }, []);

    const storeRef = useRef<AppStore>(null);
    if (!storeRef.current) {
        // Create the store instance the first time this renders
        storeRef.current = makeStore();
        storeRef.current.dispatch(setLocaleState(getLocale()));
    }

    return <Provider store={storeRef.current}>{children}</Provider>;
};

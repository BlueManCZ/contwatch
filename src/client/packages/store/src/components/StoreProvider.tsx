"use client";

import { type FC, type PropsWithChildren, useRef } from "react";
import { Provider } from "react-redux";

import { setLocaleState } from "../slices/settingsSlice";
import { type AppStore, makeStore } from "../store";

type StoreProviderProps = PropsWithChildren<{
    lang?: string;
}>;

export const StoreProvider: FC<StoreProviderProps> = ({ lang, children }) => {
    const storeRef = useRef<AppStore>(null);

    if (!storeRef.current) {
        // Create the store instance the first time this renders
        storeRef.current = makeStore();
    }

    storeRef.current.dispatch(setLocaleState(lang));

    return <Provider store={storeRef.current}>{children}</Provider>;
};

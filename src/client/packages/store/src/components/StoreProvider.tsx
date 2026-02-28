"use client";

import { type FC, type PropsWithChildren, useState } from "react";
import { Provider } from "react-redux";

import { setLocaleState } from "../slices/settingsSlice";
import { makeStore } from "../store";

type StoreProviderProps = PropsWithChildren<{
    lang?: string;
    devTools?: boolean;
}>;

export const StoreProvider: FC<StoreProviderProps> = ({ lang, devTools, children }) => {
    // const storeRef = useRef<AppStore>(null);
    //
    // if (!storeRef.current) {
    //     // Create the store instance the first time this renders
    //     storeRef.current = makeStore();
    // }
    //
    // storeRef.current.dispatch(setLocaleState(lang));

    const [store] = useState(() => {
        // Create the store instance the first time this renders
        const store = makeStore(devTools);
        store.dispatch(setLocaleState(lang));
        return store;
    });

    return <Provider store={store}>{children}</Provider>;
};

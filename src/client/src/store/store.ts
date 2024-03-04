import { Action, configureStore, ThunkAction } from "@reduxjs/toolkit";
import { createWrapper } from "next-redux-wrapper";

import { newHandlerConfigSlice } from "../partials";
import { settingsSlice } from "./settingsSlice";

const makeStore = () =>
    configureStore({
        reducer: {
            [newHandlerConfigSlice.name]: newHandlerConfigSlice.reducer,
            [settingsSlice.name]: settingsSlice.reducer,
        },
        devTools: true,
    });

export type AppStore = ReturnType<typeof makeStore>;
export type AppState = ReturnType<AppStore["getState"]>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, AppState, unknown, Action>;

export const wrapper = createWrapper<AppStore>(makeStore);

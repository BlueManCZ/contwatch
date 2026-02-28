import { type Action, configureStore, type ThunkAction } from "@reduxjs/toolkit";

import { settingsSlice } from "./slices/settingsSlice";

export const makeStore = (devTools = false) =>
    configureStore({
        reducer: {
            [settingsSlice.name]: settingsSlice.reducer,
        },
        devTools: devTools,
    });

export type AppStore = ReturnType<typeof makeStore>;
export type AppState = ReturnType<AppStore["getState"]>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, AppState, unknown, Action>;

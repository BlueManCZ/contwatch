import { Action, configureStore, ThunkAction } from "@reduxjs/toolkit";

import { settingsSlice } from "./slices/settingsSlice";

export const makeStore = () =>
    configureStore({
        reducer: {
            [settingsSlice.name]: settingsSlice.reducer,
        },
        devTools: true, // TODO: Disable in production
    });

export type AppStore = ReturnType<typeof makeStore>;
export type AppState = ReturnType<AppStore["getState"]>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, AppState, unknown, Action>;

// export const wrapper = createWrapper<AppStore>(makeStore);

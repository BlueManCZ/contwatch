import { createSlice } from "@reduxjs/toolkit";

// import { LOCALES } from "../localization";
import type { AppState } from "../store";

export enum LOCALES {
    cs = "cs",
    en = "en",
}

// Type for the state
export interface SettingsState {
    iconThemeState: string;
    localeState: LOCALES;
}

// Initial state
const initialState: SettingsState = {
    iconThemeState: "cosmic",
    localeState: LOCALES.cs,
};

// Actual Slice
export const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        setIconThemeState(state, action) {
            state.iconThemeState = action.payload;
        },
        setLocaleState(state, action) {
            state.localeState = action.payload;
        },
    },
});

export const { setIconThemeState, setLocaleState } = settingsSlice.actions;

export const selectIconThemeState = (state: AppState) => state.settings.iconThemeState;
export const selectLocaleState = (state: AppState) => state.settings.localeState;

export default settingsSlice.reducer;

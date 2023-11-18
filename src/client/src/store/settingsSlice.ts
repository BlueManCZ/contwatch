import { createSlice } from "@reduxjs/toolkit";

import { LOCALES } from "../localization";
import { AppState } from "./store";

// Type for the state
export interface SettingsState {
    navbarCollapsedState: boolean;
    iconThemeState: string;
    localeState: LOCALES;
}

// Initial state
const initialState: SettingsState = {
    navbarCollapsedState: false,
    iconThemeState: "cosmic",
    localeState: LOCALES.en_US,
};

// Actual Slice
export const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        setNavbarCollapsedState(state, action) {
            state.navbarCollapsedState = action.payload;
        },
        setIconThemeState(state, action) {
            state.iconThemeState = action.payload;
        },
        setLocaleState(state, action) {
            state.localeState = action.payload;
        },
    },
});

export const { setNavbarCollapsedState, setIconThemeState, setLocaleState } = settingsSlice.actions;

export const selectNavbarCollapsedState = (state: AppState) => state.settings.navbarCollapsedState;
export const selectIconThemeState = (state: AppState) => state.settings.iconThemeState;
export const selectLocaleState = (state: AppState) => state.settings.localeState;

export default settingsSlice.reducer;

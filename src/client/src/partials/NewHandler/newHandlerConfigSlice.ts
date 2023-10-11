import { createSlice } from "@reduxjs/toolkit";

import { AppState } from "../../store";

export interface newHandlerConfigState {
    config: Record<string, string>;
    label: string | undefined;
}

const initialState: newHandlerConfigState = {
    config: {},
    label: undefined,
};

export const newHandlerConfigSlice = createSlice({
    name: "newHandlerConfig",
    initialState,
    reducers: {
        setConfigField(state, action) {
            state.config[action.payload.fieldName] = action.payload.fieldValue;
        },
        resetNewHandler(state) {
            state.config = {};
            state.label = undefined;
        },
        setLabel(state, action) {
            state.label = action.payload;
        },
    },
});

export const { setConfigField, resetNewHandler, setLabel } = newHandlerConfigSlice.actions;

export const selectConfig = (state: AppState) => state.newHandlerConfig.config;

export const selectLabel = (state: AppState) => state.newHandlerConfig.label;

export default newHandlerConfigSlice.reducer;

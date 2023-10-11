import { FC, useEffect } from "react";
import { useDispatch } from "react-redux";

import { getLocale } from "../components/Loc/utils";
import { setLocaleState } from "./settingsSlice";

export type StoreInitProps = {};

export const StoreInit: FC<StoreInitProps> = ({}) => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(setLocaleState(getLocale()));
    }, [dispatch]);

    return <></>;
};

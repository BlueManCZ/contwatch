import { FC } from "react";
import { useSelector } from "react-redux";

import { selectLocaleState } from "../../store/settingsSlice";
import { translate } from "./utils";

export type LocProps = {
    children: number;
};

export const Loc: FC<LocProps> = ({ children }) => {
    const locale = useSelector(selectLocaleState);
    return <>{translate(children, locale)}</>;
};

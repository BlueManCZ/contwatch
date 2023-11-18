import { FC } from "react";
import { useSelector } from "react-redux";

import { LOC_KEY, useLocalization } from "../../localization";
import { selectLocaleState } from "../../store/settingsSlice";

export type LocProps = {
    children: LOC_KEY;
};

export const Loc: FC<LocProps> = ({ children }) => {
    const { translate } = useLocalization();
    const locale = useSelector(selectLocaleState);
    return translate(children, locale);
};

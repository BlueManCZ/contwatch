import { FC } from "react";

import { bemClassNames } from "../../utils";

const bem = bemClassNames("separator");

export enum SeparatorVariant {
    menu = "menu",
}

export type SeparatorProps = {
    variant: SeparatorVariant;
};

export const Separator: FC<SeparatorProps> = ({ variant }) => {
    return <div className={bem({ variant })}></div>;
};

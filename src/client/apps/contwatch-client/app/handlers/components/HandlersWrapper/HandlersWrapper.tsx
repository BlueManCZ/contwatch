import { FC, PropsWithChildren } from "react";
import { Column } from "@repo/ui/FlexPartials";

import styles from "./HandlersWrapper.module.scss";
import { bemClassNames } from "@repo/utils/bemClassNames";

type HandlersWrapperProps = PropsWithChildren;

const bem = bemClassNames(styles);

export const HandlersWrapper: FC<HandlersWrapperProps> = ({ children }) => {
    return <Column className={bem()}>{children}</Column>;
};

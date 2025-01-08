import { Column } from "@repo/ui/FlexPartials";
import { bemClassNames } from "@repo/utils/bemClassNames";
import type { FC, PropsWithChildren } from "react";

import styles from "./HandlersWrapper.module.scss";

type HandlersWrapperProps = PropsWithChildren;

const bem = bemClassNames(styles);

export const HandlersWrapper: FC<HandlersWrapperProps> = ({ children }) => {
    return <Column className={bem()}>{children}</Column>;
};

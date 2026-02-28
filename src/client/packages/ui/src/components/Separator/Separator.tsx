import { bemClassNames } from "@repo/utils/bemClassNames";
import type { Property } from "csstype";
import type { FC } from "react";

import styles from "./Separator.module.scss";

const bem = bemClassNames(styles);

export type SeparatorProps = {
    width?: Property.Width;
    height?: Property.Height;
    variant?: "navbar";
};

export const Separator: FC<SeparatorProps> = ({ variant, width, height }) => {
    return <div className={bem({ variant })} style={{ width, height }} />;
};

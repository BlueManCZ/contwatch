import { bemClassNames } from "@repo/utils/bemClassNames";
import { Property } from "csstype";
import { FC, PropsWithChildren } from "react";

import styles from "./Flex.module.scss";

const bem = bemClassNames(styles);

export type FlexProps = PropsWithChildren<{
    justifyContent?: Property.JustifyContent;
    alignItems?: Property.AlignItems;
    alignSelf?: Property.AlignSelf;
    direction?: Property.FlexDirection;
    wrap?: Property.FlexWrap;
    gap?: Property.Gap;
    basis?: Property.FlexBasis;
    height?: Property.Height;
    width?: Property.Width;
    maxWidth?: Property.MaxWidth;
    grow?: Property.FlexGrow | boolean;
    fill?: boolean;
    padding?: "content" | "card-content" | "block" | "block-small" | "groupbox";
    margin?: "vertical-large" | "vertical-medium" | "vertical-rem";
    className?: string;
    variant?: "card" | "popup";
    background?: "always-dark" | "dark" | "light" | "white";
}>;

export const Flex: FC<FlexProps> = ({
    justifyContent,
    alignItems,
    alignSelf,
    direction,
    wrap,
    gap,
    basis,
    height,
    width,
    maxWidth,
    grow,
    fill,
    padding,
    margin,
    className,
    variant,
    background,
    children,
    // onClick,
    // onWheel,
    // onMouseDown,
    // onMouseUp,
    // onMouseEnter,
    // onMouseLeave,
}) => (
    <div
        className={bem({ padding, margin, fill, variant, background }) + (className ? ` ${className}` : "")}
        style={{
            justifyContent,
            alignItems,
            alignSelf,
            flexDirection: direction,
            flexWrap: wrap,
            gap,
            flexGrow: typeof grow === "boolean" ? (grow ? 1 : 0) : grow,
            flexBasis: basis,
            height,
            maxWidth,
            width,
        }}
    >
        {children}
    </div>
);

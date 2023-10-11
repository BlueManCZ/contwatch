import { Property } from "csstype";
import { FunctionComponent, ReactNode } from "react";

import { InteractiveProps } from "../../types";
import { bemClassNames } from "../../utils";

const bem = bemClassNames("flex-layout");

export type FlexLayoutProps = InteractiveProps & {
    justifyContent?: Property.JustifyContent;
    alignItems?: Property.AlignItems;
    direction?: Property.FlexDirection;
    wrap?: Property.FlexWrap;
    gap?: Property.Gap;
    grow?: boolean;
    className?: string;
    children: ReactNode;
};

export const FlexLayout: FunctionComponent<FlexLayoutProps> = ({
    justifyContent = "unset",
    alignItems,
    direction = "row",
    wrap,
    gap,
    grow,
    className,
    children,
    onClick,
    onWheel,
    onMouseDown,
    onMouseUp,
    onMouseEnter,
    onMouseLeave,
}) => {
    let resultClassName = bem();
    if (className) resultClassName += " " + className;

    const flexGrow = grow ? "1" : undefined;

    return (
        <div
            className={resultClassName}
            style={{ justifyContent, alignItems, flexDirection: direction, flexWrap: wrap, gap, flexGrow }}
            {...{ onClick, onWheel, onMouseDown, onMouseUp, onMouseEnter, onMouseLeave }}
        >
            {children}
        </div>
    );
};

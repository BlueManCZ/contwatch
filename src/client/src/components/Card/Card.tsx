import { Property } from "csstype";
import { FunctionComponent, MouseEventHandler, ReactNode } from "react";

import { bemClassNames } from "../../utils";
import { FlexLayout } from "../FlexLayout";

const bem = bemClassNames("card");

export enum CardVariant {
    default = "default",
    clickable = "clickable",
}

export type CardProps = {
    className?: string;
    fullwidth?: boolean;
    overflow?: Property.Overflow;
    gap?: Property.Gap;
    variant?: CardVariant;
    active?: boolean;
    children: ReactNode;
    onClick?: MouseEventHandler;
};

export const Card: FunctionComponent<CardProps> = ({
    className,
    fullwidth = false,
    overflow,
    gap,
    variant = CardVariant.default,
    active = false,
    children,
    onClick,
}) => {
    let resultClassName = bem({ fullwidth, overflow, variant, active });
    if (className) resultClassName += " " + className;

    return (
        <FlexLayout className={resultClassName} onClick={onClick} direction="column" gap={gap}>
            {children}
        </FlexLayout>
    );
};

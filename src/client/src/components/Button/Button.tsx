import { FunctionComponent, MouseEvent, ReactNode } from "react";

import { bemClassNames } from "../../utils";
import { Icon, IconVariant, ThemedIconName } from "../Icon";

export enum ButtonVariant {
    default = "default",
    outline = "outline",
    navbar = "navbar",
    menu = "menu",
    none = "none",
}

export enum ButtonType {
    submit = "submit",
    button = "button",
}

export type ButtonProps = {
    type?: ButtonType;
    variant?: ButtonVariant;
    expand?: boolean;
    grow?: boolean;
    active?: boolean;
    icon?: ThemedIconName;
    onClick?: (e: MouseEvent) => void;
    children?: ReactNode;
};

const classNames = bemClassNames("button");

export const Button: FunctionComponent<ButtonProps> = ({
    type = ButtonType.submit,
    variant = ButtonVariant.default,
    expand = false,
    grow = false,
    active = false,
    icon,
    onClick,
    children,
}) => {
    return (
        <button className={classNames("", { variant, expand, grow, active })} type={type} onClick={onClick}>
            {icon && (
                <Icon
                    icon={icon}
                    invert={active}
                    variant={variant === ButtonVariant.navbar ? IconVariant.navbar : IconVariant.button}
                />
            )}
            {children}
        </button>
    );
};

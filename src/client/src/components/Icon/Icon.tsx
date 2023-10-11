import Image from "next/image";
import { FunctionComponent, MouseEventHandler } from "react";
import { useSelector } from "react-redux";

import { selectIconThemeState } from "../../store/settingsSlice";
import { bemClassNames } from "../../utils";
import { getIcon, IconName } from "./enums";

export enum IconVariant {
    circle = "circle",
    default = "default",
    navbar = "navbar",
    button = "button",
}

export type IconProps = {
    icon: IconName;
    theme?: string;
    variant?: IconVariant;
    size?: number;
    invert?: boolean;
    onClick?: MouseEventHandler;
};

const classNames = bemClassNames("icon");

export const Icon: FunctionComponent<IconProps> = ({
    icon,
    theme,
    size = 30,
    variant = IconVariant.default,
    invert = false,
    onClick,
}) => {
    const iconTheme = useSelector(selectIconThemeState);

    return (
        <Image
            className={classNames({ variant, invert, clickable: onClick })}
            src={getIcon(icon, theme ?? iconTheme)}
            alt={`${icon} icon`}
            width={size}
            height={size}
            onClick={onClick}
        />
    );
};

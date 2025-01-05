"use client";

// import { useSelector } from "react-redux";
// import { selectIconThemeState } from "../../store/settingsSlice";
import { bemClassNames } from "@repo/utils/bemClassNames";
import Image from "next/image";
import type { EventHandler, FC, KeyboardEvent, MouseEvent } from "react";

import styles from "./Icon.module.scss";

export const getIcon = (icon: string) => {
    if (CustomIcons.includes(icon)) {
        return `/icons/custom/${icon}.png`;
    }
    return `/icons/${icon}.svg`;
};

export const CustomIcons = ["battery", "http", "inverter", "serial"];

export type IconProps = {
    icon:
        | "arrow-down-square"
        | "arrow-maximize"
        | "arrow-minimize"
        | "arrow-right-down"
        | "arrow-right-up"
        | "arrow-up-square"
        | "branch-horizontal"
        | "circle"
        | "chart-square"
        | "cross-small"
        | "grid-mixed"
        | "menu"
        | "minus"
        | "plus"
        | "processor"
        | "search-trending-up"
        | "wrench"
        | "zoom-out";
    variant?: "circle" | "small-circle" | "primary" | "card" | "button";
    background?: "primary" | "green" | "red" | "purple" | "silver";
    size?: number;
    invert?: boolean | "auto";
    title?: string;
    active?: boolean;
    disabled?: boolean;
    clickable?: boolean;
    onClick?: EventHandler<MouseEvent | KeyboardEvent>;
};

const bem = bemClassNames(styles);

export const Icon: FC<IconProps> = ({
    icon,
    size = 24,
    variant,
    background,
    invert = false,
    title,
    active,
    disabled,
    clickable,
    onClick,
}) => {
    return (
        <div
            className={bem({
                variant,
                invert,
                active,
                disabled,
                background,
                clickable: !!(clickable || onClick),
            })}
            onClick={onClick}
            {...{ title }}
        >
            <Image
                className={bem("image")}
                src={getIcon(icon)}
                alt={`${icon} icon`}
                width={size}
                height={size}
                onKeyDown={(e) => e.key === "Enter" && onClick && onClick(e)}
                tabIndex={onClick ? 0 : undefined}
                style={{ width: size, height: size }}
            />
        </div>
    );
};

"use client";

import { bemClassNames } from "@repo/utils/bemClassNames";
import Link from "next/link";
import { type FC, type PropsWithChildren, useState } from "react";
import { ClipLoader } from "react-spinners";

import { Icon, type IconProps } from "../Icon/Icon";
import styles from "./Button.module.scss";

export type ButtonProps = {
    variant?: "default" | "outline" | "card" | "red";
    disabled?: boolean;
    expand?: boolean;
    grow?: boolean;
    growMobile?: boolean;
    center?: boolean;
    active?: boolean;
    icon?: IconProps["icon"];
    iconBackground?: IconProps["background"];
    iconInvert?: boolean;
    navbar?: boolean;
    blank?: boolean;
    uppercased?: boolean;
    onClick?: string | (() => Promise<boolean>) | (() => void);
    afterClick?: () => void;
    redirect?: boolean;
    slim?: boolean;
};

// TODO: Rewrite this with CSS variables?
const getIconVariant = (variant: ButtonProps["variant"]) => {
    switch (variant) {
        case "card":
            return "card";
        default:
            return "button";
    }
};

const bem = bemClassNames(styles, "button");

export const Button: FC<PropsWithChildren<ButtonProps>> = ({
    variant = "default",
    disabled,
    expand,
    grow,
    growMobile,
    center,
    active,
    icon,
    iconBackground,
    iconInvert,
    navbar,
    blank,
    uppercased = false,
    onClick,
    afterClick,
    redirect,
    slim,
    children,
}) => {
    const Component = typeof onClick === "string" ? (redirect ? "a" : Link) : "button";

    const href = onClick instanceof Function ? "" : (onClick ?? "");
    const onClickHandler = onClick instanceof Function ? onClick : undefined;

    const [loading, setLoading] = useState(false);

    return (
        <Component
            // @ts-expect-error Dont use `href` if it's an empty string.
            href={href ? href : null}
            target={blank ? "_blank" : undefined}
            onClick={async () => {
                afterClick?.();
                if (loading || !onClickHandler) {
                    return;
                }
                setLoading(true);
                setLoading((await onClickHandler()) ?? false);
            }}
            className={bem({
                variant,
                expand,
                grow,
                center,
                active,
                navbar,
                uppercased,
                growMobile,
                slim,
            })}
            {...{ disabled }}
        >
            {icon && (
                <Icon
                    icon={icon}
                    invert={iconInvert}
                    variant={getIconVariant(variant)}
                    background={iconBackground}
                    size={20}
                />
            )}
            {loading && <ClipLoader size={20} color="white" cssOverride={{ marginRight: "10px" }} />}
            {children}
        </Component>
    );
};

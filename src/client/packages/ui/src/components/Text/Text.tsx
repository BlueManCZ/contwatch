"use client";

import { bemClassNames } from "@repo/utils/bemClassNames";
import type { Property } from "csstype";
import Link from "next/link";
import type { FunctionComponent, PropsWithChildren } from "react";

import { type Font, fontDefinitions } from "../../fonts";
import styles from "./Text.module.scss";

export type TextProps = {
    className?: string;
    uppercase?: boolean;
    color?: "theme" | "mono-dark" | "mono-light" | "primary" | "secondary" | "silver" | "red";
    weight?: "light" | "medium" | "bold" | "black";
    lineHeight?: Property.LineHeight;
    align?: Property.TextAlign;
    ellipsis?: boolean;
    nowrap?: boolean;
    shadow?: boolean;
    size?: "huge" | "large" | "medium" | "normal" | "small" | "tiny" | "logo";
    font?: Font;
    variant?: "logo";
    href?: string;
    glitched?: boolean;
};

const bem = bemClassNames(styles, "text");

export const Text: FunctionComponent<PropsWithChildren<TextProps>> = ({
    className,
    uppercase,
    color,
    weight,
    lineHeight,
    align,
    ellipsis,
    nowrap,
    shadow,
    size,
    font = "open-sans",
    variant,
    href,
    glitched,
    children,
}) => {
    let resultClassName = bem({
        uppercase,
        color,
        "font-weight": weight,
        align,
        ellipsis,
        nowrap,
        shadow,
        "font-size": size,
        variant,
        glitched,
    });
    if (className) resultClassName += ` ${className}`;

    if (font) {
        resultClassName += ` ${fontDefinitions[font].className}`;
    }

    return (
        <span className={resultClassName} data-text={children} style={{ lineHeight }}>
            {href ? <Link href={href}>{children}</Link> : children}
        </span>
    );
};

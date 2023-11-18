import { KeyboardEvent, KeyboardEventHandler, WheelEvent, WheelEventHandler } from "react";

import { Key } from "./types";

export const bemClassNames = (blockClassName: string) => {
    return (classNameOrModifiers: string | Object = "", modifiers: Object = {}) => {
        let elementClassName;
        if (typeof classNameOrModifiers === "object") {
            modifiers = classNameOrModifiers;
            elementClassName = "";
        } else {
            elementClassName = classNameOrModifiers;
        }
        let className = blockClassName;
        if (elementClassName) {
            className += "__" + elementClassName;
        }
        let resultClassNames = className;
        for (const modifier of Object.keys(modifiers)) {
            const key = modifier as keyof typeof modifiers;
            if (!modifiers[key]) {
                continue;
            }
            let newClassName = "";
            if (typeof modifiers[key] === "boolean") {
                if (modifiers[key] as unknown as boolean) {
                    newClassName = `${className}--${modifier}`;
                }
            } else if (typeof modifiers[key] === "string") {
                newClassName = `${className}--${modifier}-${modifiers[key]}`;
            } else {
                newClassName = `${className}--${modifier}`;
            }
            if (newClassName) {
                resultClassNames += " " + newClassName;
            }
        }
        return resultClassNames;
    };
};

export const capitalize = (word: string) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
};

export const wheelHandler = (onScrollUp?: WheelEventHandler, onScrollDown?: WheelEventHandler) => {
    return (e: WheelEvent) => {
        if (e.deltaY < 0) {
            return onScrollUp?.(e);
        } else {
            return onScrollDown?.(e);
        }
    };
};

export const arrowHandler = (onArrowUp?: KeyboardEventHandler, onArrowDown?: KeyboardEventHandler) => {
    return (e: KeyboardEvent) => {
        switch (e.code) {
            case Key.ArrowUp:
                return onArrowUp?.(e);
            case Key.ArrowDown:
                return onArrowDown?.(e);
        }
    };
};

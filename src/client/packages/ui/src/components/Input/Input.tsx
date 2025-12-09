"use client";

import { type LOCALES, selectLocaleState } from "@repo/store/slices/settingsSlice";
import { bemClassNames } from "@repo/utils/bemClassNames";
import type { Property } from "csstype";
import { type FC, type HTMLInputTypeAttribute, useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { openSans } from "../../fonts";
import { Icon, type IconProps } from "../Icon/Icon";
import { Text } from "../Text/Text";
import styles from "./Input.module.scss";

const bem = bemClassNames(styles);

export type InputProps = {
    type?: HTMLInputTypeAttribute | "pick" | "long-text";
    value?: string | number;
    title?: string;
    placeholder?: string;
    icon?: IconProps["icon"];
    unit?: string;
    required?: boolean;
    invalid?: boolean | string;
    min?: number;
    max?: number;
    step?: number;
    controls?: boolean;
    basis?: Property.FlexBasis;
    grow?: boolean;
    growMobile?: boolean;
    postponedChanged?: boolean;
    options?: { name: string; value: string }[];
    focus?: boolean;
    checked?: boolean;

    onValueChange?(value: string): void;
    onNumberChange?(value: number): void;
    onCheckboxChange?(value: boolean): void;
};

export const Input: FC<InputProps> = ({
    type,
    value,
    title,
    placeholder,
    icon,
    unit,
    required,
    invalid,
    min,
    max,
    step = 1,
    controls,
    basis,
    grow,
    growMobile,
    postponedChanged,
    options,
    focus,
    checked,
    onValueChange,
    onNumberChange,
    onCheckboxChange,
}) => {
    if (type === "pick" && !icon) {
        icon = "chevron-down";
    }

    const offsetValue = (offset: number) => {
        return processValue(
            parseLocalizedFloat(valueState !== "" ? valueState : "0", currentLocale) + offset,
        );
    };

    const processValue = useCallback(
        (value: number) => {
            if (min !== undefined && value < min) {
                return min;
            }
            if (max && value > max) {
                return max;
            }
            if (Number.isNaN(value)) {
                return min ?? 0;
            }

            return value;
        },
        [max, min],
    );

    const parseLocalizedFloat = useCallback((input: string, locale: LOCALES) => {
        const formatter = new Intl.NumberFormat(locale);
        const parts = formatter.formatToParts(1234.5); // Example number to extract separators

        const decimalSeparator = parts.find((part) => part.type === "decimal")?.value || ".";
        const groupSeparator = parts.find((part) => part.type === "group")?.value || ",";

        // Replace group separator with nothing and decimal separator with '.'
        const normalizedInput = input.split(groupSeparator).join("").split(decimalSeparator).join(".");

        // Parse the normalized number
        return Number.parseFloat(normalizedInput);
    }, []);

    const formatLocalizedFloat = useCallback((value: number, locale: LOCALES) => {
        return new Intl.NumberFormat(locale).format(value);
    }, []);

    const commitNumberValue = (value: number, triggerChangeEvent = false) => {
        const formattedValue = formatLocalizedFloat(value, currentLocale);
        setValueState(formattedValue);
        if (triggerChangeEvent) {
            onNumberChange?.(value);
            onValueChange?.(formattedValue);
        }
    };

    const commitEmptyValue = (triggerChangeEvent = false) => {
        setValueState("");
        if (triggerChangeEvent) {
            onValueChange?.("");
        }
    };

    const [valueState, setValueState] = useState<string>(value?.toString() ?? "");

    const currentLocale = useSelector(selectLocaleState);

    useEffect(() => {
        let newValue: number;
        if (typeof value === "number") {
            newValue = value;
        } else {
            newValue = processValue(parseLocalizedFloat(value ?? "", currentLocale));
        }
        if (type === "number") {
            setValueState(formatLocalizedFloat(newValue, currentLocale));
        } else {
            setValueState(value?.toString() ?? "");
        }
    }, [currentLocale, processValue, type, value, formatLocalizedFloat, parseLocalizedFloat]);

    const Component = type === "long-text" ? "textarea" : type === "pick" ? "select" : "input";

    return (
        // biome-ignore lint/a11y/noLabelWithoutControl: off
        <label className={bem({ grow, growMobile, hasIcon: !!icon, type })} style={{ flexBasis: basis }}>
            {title && <Text size="tiny">{title}</Text>}
            <div className={`${bem("wrapper", { controls })} ${openSans.variable}`}>
                {controls && type === "number" && (
                    // biome-ignore lint/a11y/noStaticElementInteractions: off
                    // biome-ignore lint/a11y/useKeyWithClickEvents: off
                    <div className={bem("left-control")} onClick={(e) => e.preventDefault()}>
                        <Icon
                            icon="minus"
                            variant="small-circle"
                            background={
                                min !== undefined && parseLocalizedFloat(valueState, currentLocale) <= min
                                    ? "silver"
                                    : "primary"
                            }
                            disabled={
                                min !== undefined && parseLocalizedFloat(valueState, currentLocale) <= min
                            }
                            onClick={(e) => {
                                e.preventDefault();
                                commitNumberValue(offsetValue(-step), true);
                            }}
                            size={16}
                        />
                    </div>
                )}
                <Component
                    {...{ value: valueState, placeholder, required }}
                    checked={checked}
                    className={bem("input")}
                    type={type === "number" ? "text" : type}
                    autoFocus={focus}
                    onChange={(e) => {
                        if (type !== "number") {
                            if (type === "checkbox" && e.target instanceof HTMLInputElement) {
                                onCheckboxChange?.(e.target.checked);
                                return;
                            }

                            if (type !== "radio") {
                                setValueState(e.target.value);
                            }

                            if (!postponedChanged) {
                                onValueChange?.(e.target.value);
                            }
                            return;
                        }

                        const parsedValue = parseLocalizedFloat(e.target.value, currentLocale);
                        if (Number.isNaN(parsedValue)) {
                            commitEmptyValue(!postponedChanged);
                            return;
                        }

                        commitNumberValue(
                            postponedChanged ? parsedValue : processValue(parsedValue),
                            !postponedChanged,
                        );
                    }}
                    onBlur={(e) => {
                        if (!postponedChanged) {
                            return;
                        }

                        if (type !== "number") {
                            onValueChange?.(e.target.value);
                            return;
                        }

                        const parsedValue = parseLocalizedFloat(e.target.value, currentLocale);
                        if (Number.isNaN(parsedValue)) {
                            commitEmptyValue(true);
                            return;
                        }

                        commitNumberValue(processValue(parsedValue), true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            if (postponedChanged && e.target instanceof HTMLInputElement) {
                                if (type !== "number") {
                                    onValueChange?.(e.target.value);
                                } else {
                                    const parsedValue = parseLocalizedFloat(e.target.value, currentLocale);
                                    if (Number.isNaN(parsedValue)) {
                                        commitEmptyValue(true);
                                        return;
                                    }

                                    commitNumberValue(processValue(parsedValue), true);
                                }
                            }
                        }
                    }}
                >
                    {options?.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.name}
                        </option>
                    ))}
                </Component>
                {unit && <Text weight="medium">{unit}</Text>}
                {icon && (
                    <div className={bem("icon")}>
                        <Icon icon={icon} size={20} />
                    </div>
                )}
                {controls && type === "number" && (
                    <div className={bem("right-control")}>
                        <Icon
                            icon="plus"
                            variant="small-circle"
                            background={
                                max !== undefined && parseLocalizedFloat(valueState, currentLocale) >= max
                                    ? "silver"
                                    : "primary"
                            }
                            disabled={
                                max !== undefined && parseLocalizedFloat(valueState, currentLocale) >= max
                            }
                            onClick={(e) => {
                                e.preventDefault();
                                commitNumberValue(offsetValue(step), true);
                            }}
                            size={16}
                        />
                    </div>
                )}
                {placeholder && (type === "checkbox" || type === "radio") && (
                    <Text
                        className={bem("checkbox-placeholder")}
                        size="small"
                        color={invalid || required ? "red" : undefined}
                        weight={invalid || required ? "medium" : undefined}
                    >
                        {placeholder}
                    </Text>
                )}
            </div>
        </label>
    );
};

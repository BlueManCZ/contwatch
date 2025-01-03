"use client";

import { LOCALES, selectLocaleState } from "@repo/store/slices/settingsSlice";
import { bemClassNames } from "@repo/utils/bemClassNames";
import { Property } from "csstype";
import { FC, HTMLInputTypeAttribute, useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { openSans } from "../../fonts";
import { Icon, IconProps } from "../Icon/Icon";
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
    min?: number;
    max?: number;
    step?: number;
    controls?: boolean;
    basis?: Property.FlexBasis;
    grow?: boolean;
    growMobile?: boolean;
    postponedChanged?: boolean;
    onValueChange?: (value: string) => void;
    onNumberChange?: (value: number) => void;
    options?: { name: string; value: string }[];
};

export const Input: FC<InputProps> = ({
    type,
    value,
    title,
    placeholder,
    icon,
    unit,
    required,
    min,
    max,
    step = 1,
    controls,
    basis,
    grow,
    growMobile,
    postponedChanged,
    onValueChange,
    onNumberChange,
    options,
}) => {
    const offsetValue = (offset: number) => {
        return processValue(
            parseLocalizedFloat(valueState !== "" ? valueState : "0", currentLocale) + offset,
        );
    };

    const processValue = useCallback(
        (value: number) => {
            if (min !== undefined && value < min) {
                return min;
            } else if (max && value > max) {
                return max;
            } else if (isNaN(value)) {
                return min ?? 0;
            }

            return value;
        },
        [max, min],
    );

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
        // onNumberChange?.(0);
        if (triggerChangeEvent) {
            onValueChange?.("");
        }
    };

    const [valueState, setValueState] = useState<string>("");

    const currentLocale = useSelector(selectLocaleState);

    useEffect(() => {
        let newValue;
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
    }, [currentLocale, processValue, type, value]);

    function parseLocalizedFloat(input: string, locale: LOCALES) {
        const formatter = new Intl.NumberFormat(locale);
        const parts = formatter.formatToParts(1234.5); // Example number to extract separators

        const decimalSeparator = parts.find((part) => part.type === "decimal")?.value || ".";
        const groupSeparator = parts.find((part) => part.type === "group")?.value || ",";

        // Replace group separator with nothing and decimal separator with '.'
        const normalizedInput = input.split(groupSeparator).join("").split(decimalSeparator).join(".");

        // Parse the normalized number
        return parseFloat(normalizedInput);
    }

    function formatLocalizedFloat(value: number, locale: LOCALES) {
        return new Intl.NumberFormat(locale).format(value);
    }

    const Component = type === "long-text" ? "textarea" : type === "pick" ? "select" : "input";

    return (
        <label className={bem({ grow, growMobile, hasIcon: !!icon })} style={{ flexBasis: basis }}>
            {title && <Text size="small">{title}</Text>}
            <div className={bem("wrapper", { controls }) + " " + openSans.variable}>
                {controls && type === "number" && (
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
                            size={20}
                        />
                    </div>
                )}
                <Component
                    {...{ value: valueState, placeholder, required }}
                    className={bem("input")}
                    type={type === "number" ? "text" : type}
                    onChange={(e) => {
                        if (type !== "number") {
                            setValueState(e.target.value);
                            if (!postponedChanged) {
                                onValueChange?.(e.target.value);
                            }
                            return;
                        }

                        const parsedValue = parseLocalizedFloat(e.target.value, currentLocale);
                        if (isNaN(parsedValue)) {
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
                        if (isNaN(parsedValue)) {
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
                                    if (isNaN(parsedValue)) {
                                        commitEmptyValue(true);
                                        return;
                                    }

                                    commitNumberValue(processValue(parsedValue), true);
                                }
                            }
                        }
                    }}
                >
                    {options && (
                        <>
                            {options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.name}
                                </option>
                            ))}
                        </>
                    )}
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
                            size={20}
                        />
                    </div>
                )}
            </div>
        </label>
    );
};

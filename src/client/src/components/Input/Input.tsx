import { FC, HTMLInputTypeAttribute, MutableRefObject, useState } from "react";

import { bemClassNames } from "../../utils";

const classNames = bemClassNames("input-wrapper");

export type InputProps = {
    locKey?: number;
    type?: HTMLInputTypeAttribute | "pick";
    placeholder?: string;
    value?: string;
    name?: string;
    innerRef?: MutableRefObject<any>;
    min?: number;
    step?: number;
    onValueChange?: (value: string) => void;
    onDateChange?: (date: Date | null) => void;
};

export const Input: FC<InputProps> = ({
    type = "text",
    placeholder = "",
    value = "",
    name,
    innerRef,
    min,
    step,
    onValueChange,
    onDateChange,
}) => {
    const [valueState, setValueState] = useState(value);

    return (
        <div className={classNames()}>
            <input
                ref={innerRef}
                className={classNames("input-element")}
                value={valueState}
                onChange={(e) => {
                    setValueState(e.target.value);
                    if (type === "datetime-local") {
                        onDateChange?.(e.target.valueAsDate);
                    } else {
                        onValueChange?.(e.target.value);
                    }
                }}
                {...{ type, placeholder, name, min, step }}
            />
        </div>
    );
};

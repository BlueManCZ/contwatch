import { FC, HTMLInputTypeAttribute, MutableRefObject, useState } from "react";

import { bemClassNames } from "../../utils";

const classNames = bemClassNames("input-wrapper");

export type InputProps = {
    type?: HTMLInputTypeAttribute | "pick";
    placeholder?: string;
    value?: string | boolean;
    name?: string;
    innerRef?: MutableRefObject<any>;
    min?: number;
    step?: number;
    onValueChange?: (value: string | boolean) => void;
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
                value={valueState.toString()}
                checked={valueState as boolean}
                onChange={(e) => {
                    if (type === "datetime-local") {
                        setValueState(e.target.value);
                        onDateChange?.(e.target.valueAsDate);
                    } else if (type === "checkbox") {
                        setValueState(e.target.checked);
                        onValueChange?.(e.target.checked);
                    } else {
                        setValueState(e.target.value);
                        onValueChange?.(e.target.value);
                    }
                }}
                {...{ type, placeholder, name, min, step }}
            />
        </div>
    );
};

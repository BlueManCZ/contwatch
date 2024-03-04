import { FC } from "react";

import { bemClassNames } from "../../utils";
import { FlexLayout } from "../FlexLayout";
import { Input } from "../Input";

const bem = bemClassNames("input-renderer");

export type InputRendererProps = {
    name: string;
    type: string;
    title: string;
    value?: string;
    onValueChange?: (value: string) => void;
};

export const InputRenderer: FC<InputRendererProps> = ({ name, type, title, value, onValueChange }) => {
    return (
        <FlexLayout className={bem()} direction="column" gap="5px">
            <label htmlFor={name} className={bem("label")}>
                {title}
            </label>
            {type === "string" && <Input {...{ value, name, onValueChange }} />}
            {type === "float" && <Input {...{ value, name, onValueChange }} type="number" step={0.1} />}
            {type === "int" && <Input {...{ value, name, onValueChange }} type="number" />}
        </FlexLayout>
    );
};

import { FC } from "react";

import { bemClassNames } from "../../../utils";
import { Icon, IconName } from "../../Icon";

const bem = bemClassNames("attribute-widget");

export type AttributeWidgetProps = {
    title: string;
    description: string;
    icon: IconName;
    status: number;
    unit: string;
    value: string | number | boolean;
};

export const AttributeWidget: FC<AttributeWidgetProps> = ({
    title,
    description,
    icon,
    status,
    unit,
    value,
}) => {
    return (
        <div className={bem({ disabled: status !== 1 })}>
            <Icon icon={icon} />
            <div className={bem("text-body")}>
                <div className={bem("title")}>{title}</div>
                <div className={bem("description")}>{description}</div>
            </div>
            {value && (
                <div className={bem("value")}>
                    {value} <span className={bem("unit")}>{unit}</span>
                </div>
            )}
        </div>
    );
};

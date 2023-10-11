import { FC } from "react";

import { bemClassNames } from "../../../utils";
import { Icon, ThemedIconName } from "../../Icon";

const bem = bemClassNames("attribute-widget");

export type AttributeWidgetProps = {
    title: string;
    description: string;
    value: string | number | boolean;
    unit: string;
    icon: ThemedIconName;
};

export const AttributeWidget: FC<AttributeWidgetProps> = ({ title, description, value, unit, icon }) => {
    return (
        <div className={bem()}>
            <Icon icon={icon} />
            <div className={bem("text-body")}>
                <div className={bem("title")}>{title}</div>
                <div className={bem("description")}>{description}</div>
            </div>
            <div className={bem("value")}>
                {value} <span className={bem("unit")}>{unit}</span>
            </div>
        </div>
    );
};

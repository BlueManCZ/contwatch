import { FC } from "react";

import { bemClassNames } from "../../../utils";
import { Icon, IconName } from "../../Icon";

const bem = bemClassNames("attribute-widget");

export type AttributeWidgetProps = {
    title: string;
    description: string;
    value: string | number | boolean;
    unit: string;
    icon: IconName;
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

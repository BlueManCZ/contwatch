import { FC } from "react";

import { bemClassNames } from "../../../utils";
import { Icon, IconName } from "../../Icon";

const bem = bemClassNames("switch-widget");

export type SwitchWidget = {
    title: string;
    description: string;
    icon: IconName;
    active: boolean;
};

export const SwitchWidget: FC<SwitchWidget> = ({ title, description, active, icon }) => {
    return (
        <div className={bem({ active })}>
            <Icon icon={icon} invert={active} />
            <div className={bem("text-body")}>
                <div className={bem("title")}>{title}</div>
                <div className={bem("description")}>{description}</div>
            </div>
            <div className={bem("toggle")} />
        </div>
    );
};

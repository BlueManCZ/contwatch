import { FC } from "react";
import { useSWRConfig } from "swr";

import { toggleWidgetSwitch } from "../../../bridge";
import { Endpoint, getApiEndpoint } from "../../../bridge/endpoints";
import { bemClassNames } from "../../../utils";
import { Icon, IconName } from "../../Icon";

const bem = bemClassNames("switch-widget");

export type SwitchWidget = {
    id: number;
    title: string;
    description: string;
    icon: IconName;
    status: number;
    active: boolean;
};

export const SwitchWidget: FC<SwitchWidget> = ({ id, title, description, icon, status, active }) => {
    const { mutate } = useSWRConfig();

    const toggleSwitch = (active: boolean) => {
        toggleWidgetSwitch(id, active, () => {
            mutate(getApiEndpoint(Endpoint.widgetSwitches));
        });
    };

    return (
        <div className={bem({ active, disabled: status !== 1 })} onClick={() => toggleSwitch(!active)}>
            <Icon icon={icon} invert={active} />
            <div className={bem("text-body")}>
                <div className={bem("title")}>{title}</div>
                <div className={bem("description")}>{description}</div>
            </div>
            <div className={bem("toggle")} />
        </div>
    );
};

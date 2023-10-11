import { FC } from "react";

import { bemClassNames } from "../../../../utils";
import { FlexLayout } from "../../../FlexLayout";
import { Icon, IconName } from "../../../Icon";

const bem = bemClassNames("menu-item");

export type AbstractComponentProps = {
    title: string;
    description?: string;
    active?: boolean;
    icon?: IconName;
    colorFlag?: string;
    onClick?: () => void;
};

export const MenuItem: FC<AbstractComponentProps> = ({
    title,
    description,
    icon,
    colorFlag,
    active,
    onClick,
}) => {
    return (
        <FlexLayout className={bem({ active })} gap="8px" onClick={onClick}>
            {icon && <Icon icon={icon} invert={active} />}
            <FlexLayout direction="column" grow={true} gap="2px">
                <div className={bem("title")}>{title}</div>
                {description && <div className={bem("description")}>{description}</div>}
            </FlexLayout>
            <div className={bem("color-flag", { color: colorFlag })} />
        </FlexLayout>
    );
};

import { FunctionComponent } from "react";

import { bemClassNames } from "../../../../utils";
import { FlexLayout } from "../../../FlexLayout";
import { CustomIconName, Icon, IconVariant, ThemedIconName } from "../../../Icon";

export type CardHeaderProps = {
    title: string;
    icon?: ThemedIconName | CustomIconName;
    subtitle?: string;
};

const classNames = bemClassNames("card-header");

export const CardHeader: FunctionComponent<CardHeaderProps> = ({ title, icon, subtitle }) => {
    return (
        <FlexLayout className={classNames()} gap="15px">
            {icon && <Icon icon={icon} variant={IconVariant.circle} />}
            <FlexLayout direction="column">
                {title && <div className={classNames("title")}>{title}</div>}
                {subtitle && <div className={classNames("subtitle")}>{subtitle}</div>}
            </FlexLayout>
        </FlexLayout>
    );
};

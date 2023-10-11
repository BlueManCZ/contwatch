import { FunctionComponent } from "react";

import { bemClassNames } from "../../../../utils";
import { FlexLayout } from "../../../FlexLayout";
import { Icon, IconVariant, ThemedIconName } from "../../../Icon";

export type NavbarUserProps = {
    userName: string;
    email: string;
    picture?: string;
    collapsed: boolean;
};

const classNames = bemClassNames("navbar-user");

export const NavbarUser: FunctionComponent<NavbarUserProps> = ({ userName, email, collapsed }) => {
    return (
        <FlexLayout className={classNames()}>
            <Icon icon={ThemedIconName.user} variant={IconVariant.circle} size={20}></Icon>
            {!collapsed && (
                <FlexLayout direction="column">
                    <div className={classNames("name")}>{userName}</div>
                    <div className={classNames("email")}>{email}</div>
                </FlexLayout>
            )}
        </FlexLayout>
    );
};

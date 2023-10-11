import { FC } from "react";

import { bemClassNames } from "../../../../utils";
import { FlexLayout } from "../../../FlexLayout";
import { CustomIconName, Icon } from "../../../Icon";

export type NavbarLogoProps = {
};

const classNames = bemClassNames("navbar-logo");

export const NavbarLogo: FC<NavbarLogoProps> = () => {
    return (
        <FlexLayout className={classNames()}>
            <Icon icon={CustomIconName.logo} />
        </FlexLayout>
    );
};

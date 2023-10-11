import { useRouter } from "next/router";
import { FC } from "react";
import { useSelector } from "react-redux";

import { selectNavbarCollapsedState } from "../../../../store/settingsSlice";
import { bemClassNames } from "../../../../utils";
import { FlexLayout } from "../../../FlexLayout";
import { Icon, ThemedIconName } from "../../../Icon";
import { Loc } from "../../../Loc";

const bem = bemClassNames("navbar-item");

export type NavbarItemProps = {
    locKey: number;
    icon: ThemedIconName;
    href: string;
};

export const NavbarItem: FC<NavbarItemProps> = ({ locKey, icon, href }) => {
    const navbarCollapsed = useSelector(selectNavbarCollapsedState);
    const router = useRouter();
    return (
        <FlexLayout
            className={bem({ active: router.asPath.startsWith(href) })}
            onClick={() => {
                if (href) router.push(href);
            }}
            alignItems="center"
            gap="16px"
        >
            <Icon icon={icon} />
            {!navbarCollapsed && <Loc>{locKey}</Loc>}
        </FlexLayout>
    );
};

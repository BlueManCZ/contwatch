import { usePathname, useRouter } from "next/navigation";
import { FC } from "react";
import { useSelector } from "react-redux";

import { LOC_KEY } from "../../../../localization";
import { selectNavbarCollapsedState } from "../../../../store/settingsSlice";
import { bemClassNames } from "../../../../utils";
import { FlexLayout } from "../../../FlexLayout";
import { Icon, ThemedIconName } from "../../../Icon";
import { Loc } from "../../../Loc";

const bem = bemClassNames("navbar-item");

export type NavbarItemProps = {
    locKey: LOC_KEY;
    icon: ThemedIconName;
    href: string;
};

export const NavbarItem: FC<NavbarItemProps> = ({ locKey, icon, href }) => {
    const navbarCollapsed = useSelector(selectNavbarCollapsedState);
    const pathName = usePathname();
    const router = useRouter();
    const active = pathName.startsWith(href);
    return (
        <FlexLayout
            className={bem({ active })}
            onClick={() => {
                if (href) router.push(href);
            }}
            alignItems="center"
            gap="16px"
        >
            <Icon icon={icon} invert={active} />
            {!navbarCollapsed && <Loc>{locKey}</Loc>}
        </FlexLayout>
    );
};

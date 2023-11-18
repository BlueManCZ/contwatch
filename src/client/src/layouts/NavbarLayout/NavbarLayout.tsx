import { FunctionComponent, ReactNode } from "react";

import { FlexLayout, Navbar, NavbarItem, NavbarLogo, NavbarSection, ThemedIconName } from "../../components";
import { LOC_KEY } from "../../localization";
import { bemClassNames } from "../../utils";

const bem = bemClassNames("navbar-layout");

const navbarItems = [
    { locKey: LOC_KEY.DASHBOARD, href: "/dashboard", icon: ThemedIconName.gridMixed },
    { locKey: LOC_KEY.INSPECTOR, href: "/inspector", icon: ThemedIconName.chartSquare },
    { locKey: LOC_KEY.HANDLERS, href: "/handlers", icon: ThemedIconName.processor },
];

export type NavbarLayoutProps = {
    children: ReactNode;
};

export const NavbarLayout: FunctionComponent<NavbarLayoutProps> = ({ children }) => {
    return (
        <FlexLayout className={bem()}>
            <Navbar>
                <NavbarSection>
                    <NavbarLogo />
                </NavbarSection>
                <NavbarSection>
                    {navbarItems.map((item) => (
                        <NavbarItem key={item.href} locKey={item.locKey} icon={item.icon} href={item.href} />
                    ))}
                </NavbarSection>
            </Navbar>
            <FlexLayout direction="column" gap="20px" className={bem("content")}>
                {children}
            </FlexLayout>
        </FlexLayout>
    );
};

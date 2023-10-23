import { FunctionComponent, ReactNode } from "react";

import { FlexLayout, Navbar, NavbarItem, NavbarLogo, NavbarSection, ThemedIconName } from "../../components";
import { bemClassNames, GLOBAL_LOC_KEYS } from "../../utils";

const bem = bemClassNames("navbar-layout");

const navbarItems = [
    { locKey: GLOBAL_LOC_KEYS.DASHBOARD, href: "/dashboard", icon: ThemedIconName.gridMixed },
    { locKey: GLOBAL_LOC_KEYS.INSPECTOR, href: "/inspector", icon: ThemedIconName.chartSquare },
    { locKey: GLOBAL_LOC_KEYS.HANDLERS, href: "/handlers", icon: ThemedIconName.processor },
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

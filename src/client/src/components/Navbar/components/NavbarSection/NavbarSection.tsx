import { FC, ReactNode } from "react";

import { bemClassNames } from "../../../../utils";
import { FlexLayout } from "../../../FlexLayout";

const bem = bemClassNames("navbar-section");

export type NavbarSectionProps = {
    children: ReactNode;
};

export const NavbarSection: FC<NavbarSectionProps> = ({ children }) => {
    return (
        <FlexLayout className={bem()} direction="column" alignItems="center">
            {children}
        </FlexLayout>
    );
};

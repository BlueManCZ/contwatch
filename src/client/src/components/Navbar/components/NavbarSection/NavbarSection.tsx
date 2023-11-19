import { FC, ReactNode } from "react";

import { bemClassNames } from "../../../../utils";
import { FlexLayout } from "../../../FlexLayout";

const bem = bemClassNames("navbar-section");

export type NavbarSectionProps = {
    grow?: boolean;
    children: ReactNode;
};

export const NavbarSection: FC<NavbarSectionProps> = ({ children, grow }) => {
    return (
        <FlexLayout className={bem()} direction="column" alignItems="center" grow={grow}>
            {children}
        </FlexLayout>
    );
};

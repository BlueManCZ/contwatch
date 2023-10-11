import { FunctionComponent, ReactNode } from "react";

import { User } from "../../types";
import { bemClassNames } from "../../utils";
import { FlexLayout } from "../";

export type NavbarProps = {
    collapsed?: boolean;
    user?: User;
    children: ReactNode;
};

const classNames = bemClassNames("navbar");

export const Navbar: FunctionComponent<NavbarProps> = ({ children }) => {
    return (
        <FlexLayout className={classNames()} direction="column">
            {children}
        </FlexLayout>
    );
};

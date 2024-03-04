import { FC, ReactNode } from "react";

import { bemClassNames } from "../../utils";
import { FlexLayout } from "../FlexLayout";

const bem = bemClassNames("menu");

export type MenuComponentProps = {
    children?: ReactNode;
};

export const Menu: FC<MenuComponentProps> = ({ children }) => {
    return (
        <FlexLayout className={bem()} direction="column" gap="1rem">
            {children}
        </FlexLayout>
    );
};

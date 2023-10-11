import { FC, ReactNode } from "react";

import { bemClassNames } from "../../../../utils";
import { FlexLayout } from "../../../FlexLayout";

const bem = bemClassNames("menu-section");

export type MenuSectionProps = {
    title: string;
    description: string;
    children?: ReactNode;
};

export const MenuSection: FC<MenuSectionProps> = ({ title, description, children }) => {
    return (
        <FlexLayout className={bem()} direction="column" gap="12px">
            <div className={bem("header")}>
                <h2 className={bem("title")}>{title}</h2>
                <p className={bem("description")}>{description}</p>
            </div>
            {children}
        </FlexLayout>
    );
};

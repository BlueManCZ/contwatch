import { FC, ReactNode } from "react";

import { bemClassNames } from "../../utils";
import { FlexLayout } from "../FlexLayout";

const bem = bemClassNames("menu");

export type MenuComponentProps = {
    title: string;
    description: string;
    children?: ReactNode;
};

export const Menu: FC<MenuComponentProps> = ({ title, description, children }) => {
    return (
        <FlexLayout className={bem()} direction="column">
            <div className={bem("header")}>
                <h1 className={bem("title")}>{title}</h1>
                <p className={bem("description")}>{description}</p>
            </div>
            {children}
        </FlexLayout>
    );
};

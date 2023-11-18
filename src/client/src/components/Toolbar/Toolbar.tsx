import { ReactNode } from "react";

import { bemClassNames } from "../../utils";
import { Icon, IconName } from "../Icon";

const bem = bemClassNames("toolbar");

type ToolbarProps = {
    icon?: IconName;
    title?: string;
    description?: string;
    children?: ReactNode;
};

export const Toolbar = ({ icon, title, description, children }: ToolbarProps) => {
    return (
        <div className={bem()}>
            <div className={bem("icon-plate")}>{icon && <Icon {...{ icon }} invert />}</div>
            {(title || description) && (
                <div className={bem("header")}>
                    {title && <h1 className={bem("title")}>{title}</h1>}
                    {description && <p className={bem("description")}>{description}</p>}
                </div>
            )}
            {children}
        </div>
    );
};

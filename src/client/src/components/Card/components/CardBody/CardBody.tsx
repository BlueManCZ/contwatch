import { Property } from "csstype";
import { FunctionComponent, ReactNode } from "react";

import { bemClassNames } from "../../../../utils";
import { FlexLayout } from "../../../FlexLayout";

export type CardBodyProps = {
    gap?: Property.Gap;
    children: ReactNode;
};

const classNames = bemClassNames("card-body");

export const CardBody: FunctionComponent<CardBodyProps> = ({ gap = "20px", children }) => {
    return (
        <FlexLayout className={classNames()} direction="column" gap={gap}>
            {children}
        </FlexLayout>
    );
};

import { FC, ReactNode } from "react";

import { bemClassNames } from "../../utils";

export enum HeaderSize {
    h1 = "h1",
    h2 = "h2",
    h3 = "h3",
    h4 = "h4",
}

export type HeaderProps = {
    children?: ReactNode;
    size?: HeaderSize;
};

const classNames = bemClassNames("header");

export const Header: FC<HeaderProps> = ({ children, size = HeaderSize.h1 }) => {
    const className = classNames({ size: size });
    switch (size) {
        case HeaderSize.h1:
            return <h1 className={className}>{children}</h1>;
        case HeaderSize.h2:
            return <h2 className={className}>{children}</h2>;
        case HeaderSize.h3:
            return <h3 className={className}>{children}</h3>;
        case HeaderSize.h4:
            return <h4 className={className}>{children}</h4>;
    }
};

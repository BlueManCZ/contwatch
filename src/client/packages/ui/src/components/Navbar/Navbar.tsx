import { bemClassNames } from "@repo/utils/bemClassNames";
import { FC, PropsWithChildren } from "react";

import styles from "./Navbar.module.scss";
import { Flex } from "../Flex/Flex";

const bem = bemClassNames(styles);

export type NavbarProps = {
    width?: string;
    visible?: boolean;
};

export const Navbar: FC<PropsWithChildren<NavbarProps>> = ({ visible = false, children }) => {
    return <Flex className={bem({ visible })}>{children}</Flex>;
};

import { bemClassNames } from "@repo/utils/bemClassNames";
import type { FC, PropsWithChildren } from "react";

import { Flex } from "../Flex/Flex";
import styles from "./Navbar.module.scss";

const bem = bemClassNames(styles);

export type NavbarProps = {
    width?: string;
    visible?: boolean;
};

export const Navbar: FC<PropsWithChildren<NavbarProps>> = ({ visible = false, children }) => {
    return <Flex className={bem({ visible })}>{children}</Flex>;
};

import { Icon, type IconProps } from "@repo/ui/Icon";
import { Text } from "@repo/ui/Text";
import { bemClassNames } from "@repo/utils/bemClassNames";
import { useActivePathname } from "@repo/utils/useActivePathname";
import Link from "next/link";
import type { FC } from "react";

import styles from "./NavbarItem.module.scss";

const bem = bemClassNames(styles);

type NavbarItemProps = {
    href: string;
    name: string;
    icon: IconProps["icon"];
    onClick?: () => void;
};

export const NavbarItem: FC<NavbarItemProps> = ({ href, name, icon, onClick }) => {
    const { active } = useActivePathname(href);

    return (
        <Link href={href} className={bem({ active })} onClick={onClick}>
            <Icon icon={icon} invert={active} />
            <Text weight="medium" size={"small"}>
                {name}
            </Text>
        </Link>
    );
};

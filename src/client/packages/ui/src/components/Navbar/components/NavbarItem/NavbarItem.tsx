"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FC } from "react";

import { Text } from "@repo/ui/Text";
import { Icon, IconProps } from "@repo/ui/Icon";

import styles from "./NavbarItem.module.scss";
import { bemClassNames } from "@repo/utils/bemClassNames";

const bem = bemClassNames(styles);

type NavbarItemProps = {
    href: string;
    name: string;
    icon: IconProps["icon"];
    onClick?: () => void;
};

export const NavbarItem: FC<NavbarItemProps> = ({ href, name, icon, onClick }) => {
    const pathname = usePathname();
    const active = pathname.endsWith(href);

    return (
        <Link href={href} className={bem({ active })} onClick={onClick}>
            <Icon icon={icon} invert={active} />
            <Text weight="medium" size={"small"}>
                {name}
            </Text>
        </Link>
    );
};

"use client";

import { bemClassNames } from "@repo/utils/bemClassNames";
import { useTranslation } from "@repo/utils/useTranslation";
import Image from "next/image";
import { type FC, type PropsWithChildren, useMemo, useState } from "react";

import { Column } from "../../partials/FlexPartials/FlexPartials";
import { Flex } from "../Flex/Flex";
import { Icon, type IconProps } from "../Icon/Icon";
import { NavbarItem } from "../Navbar/components/NavbarItem/NavbarItem";
import { Navbar } from "../Navbar/Navbar";
import styles from "./NavbarLayout.module.scss";

export type NavbarLayoutProps = PropsWithChildren;

const bem = bemClassNames(styles);

export const NavbarLayout: FC<NavbarLayoutProps> = ({ children }) => {
    const { t } = useTranslation();
    const [showNavbar, setShowNavbar] = useState(false);

    const routes: { url: string; name: string; icon: IconProps["icon"] }[] = useMemo(
        () => [
            { url: "/", name: t("Overview"), icon: "grid-mixed" },
            { url: "/inspector", name: t("Inspector"), icon: "chart-square" },
            { url: "/handlers", name: t("Handlers"), icon: "processor" },
            { url: "/actions", name: t("Actions"), icon: "branch-horizontal" },
        ],
        [t],
    );

    const killMenu = () => {
        setShowNavbar(false);
    };

    return (
        <Flex className={bem()}>
            <Navbar visible={showNavbar}>
                <Image
                    src={"/logo.png"}
                    alt={"Contwatch logo"}
                    width={30}
                    height={30}
                    style={{ opacity: ".7", marginTop: "3rem", marginBottom: "1rem" }}
                />
                {routes.map((route) => (
                    <NavbarItem
                        key={route.url}
                        href={route.url}
                        name={route.name}
                        icon={route.icon}
                        onClick={killMenu}
                    />
                ))}
            </Navbar>
            <Column className={bem("content")} gap={"1.5rem"}>
                {children}
            </Column>
            <div className={bem("mobile-menu-button")}>
                <Icon onClick={() => setShowNavbar(!showNavbar)} icon={"menu"} size={30} />
            </div>
        </Flex>
    );
};

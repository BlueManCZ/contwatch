import { bemClassNames } from "@repo/utils/bemClassNames";
import Link from "next/link";
import type { FC, PropsWithChildren } from "react";

import { Column } from "../../partials/FlexPartials/FlexPartials";
import { Flex } from "../Flex/Flex";
import { Icon } from "../Icon/Icon";
import { Text } from "../Text/Text";
import styles from "./Popup.module.scss";

const bem = bemClassNames(styles);

export type PopupProps = {
    visible?: boolean;
    title?: string;
    titleHref?: string;
    titleOnClick?: () => void;
    onClose?: () => void;
};

export const Popup: FC<PropsWithChildren<PopupProps>> = ({
    visible,
    title,
    titleHref,
    titleOnClick,
    onClose,
    children,
}) => {
    return (
        visible && (
            <div className={bem({ visible })}>
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: */}
                <div className={bem("overlay")} onClick={onClose} />
                <Column maxHeight={"90%"} maxWidth={"90%"}>
                    <Column variant="popup" width="100%">
                        <div style={{ position: "sticky", top: 0, zIndex: 1, background: "white" }}>
                            <Flex className={bem("header")} padding={"block"}>
                                <Flex justifyContent="space-between" alignItems={"center"} gap={"3rem"} grow>
                                    {title ? (
                                        titleHref ? (
                                            <Text size="medium" weight="black">
                                                <Link href="/" onClick={titleOnClick}>
                                                    {title}
                                                </Link>
                                            </Text>
                                        ) : (
                                            <Text size="medium" weight="black">
                                                {title}
                                            </Text>
                                        )
                                    ) : (
                                        <Text size="medium" />
                                    )}
                                    <Icon icon="cross-small" onClick={onClose} size={30} />
                                </Flex>
                            </Flex>
                        </div>

                        <div className={bem("content")}>{children}</div>
                    </Column>
                </Column>
            </div>
        )
    );
};

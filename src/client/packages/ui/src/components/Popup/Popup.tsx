import { bemClassNames } from "@repo/utils/bemClassNames";
import Link from "next/link";
import { FC, PropsWithChildren } from "react";

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
                <div className={bem("overlay")} onClick={onClose} />
                <Column padding="content" width="100%">
                    <Column variant="popup" width="100%">
                        <div style={{ position: "sticky", top: 0, zIndex: 1 }}>
                            <Flex padding={"block"}>
                                <Flex justifyContent="space-between" grow>
                                    {title ? (
                                        titleHref ? (
                                            <Text size="medium" weight="black">
                                                <Link href="/" onClick={titleOnClick}>
                                                    {title.toUpperCase()}
                                                </Link>
                                            </Text>
                                        ) : (
                                            <Text size="medium" weight="black">
                                                {title.toUpperCase()}
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

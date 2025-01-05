import type { HandlerModel } from "@repo/types/HandlerModel";
import { Flex } from "@repo/ui/Flex";
import { Column } from "@repo/ui/FlexPartials";
import { Icon } from "@repo/ui/Icon";
import { Text } from "@repo/ui/Text";
import { bemClassNames } from "@repo/utils/bemClassNames";
import { useHandlerAttributes } from "@repo/utils/swrEndpoints";
import { useTranslation } from "@repo/utils/useTranslation";
import { DateTime } from "luxon";
import type { FC } from "react";

import { AttributeWidget } from "../AttributeWidget/AttributeWidget";
import styles from "./HandlerWidget.module.scss";

type HandlerWidgetProps = {
    handler: HandlerModel;
};

const bem = bemClassNames(styles);

export const HandlerWidget: FC<HandlerWidgetProps> = ({ handler }) => {
    const { t } = useTranslation();
    const { data: attributes } = useHandlerAttributes(handler.id);

    return (
        <Column className={bem()}>
            <Flex
                className={bem("header", { color: handler.status })}
                alignItems={"center"}
                padding={"groupbox"}
                gap={".5rem"}
            >
                <Icon icon={handler.icon} invert />
                <Column grow width={0}>
                    <Text weight={"bold"} nowrap ellipsis>
                        {handler.name}
                    </Text>
                    <Text size={"tiny"} nowrap ellipsis>
                        {handler.description}
                    </Text>
                </Column>
                <Column>
                    <Text size={"tiny"} align={"right"} nowrap>
                        {t("Data received")}:{" "}
                        <b>
                            {handler.last_message !== null
                                ? (handler.last_message ?? 0) < 10
                                    ? t("Now")
                                    : DateTime.local().minus({ seconds: handler.last_message }).toRelative()
                                : t("Never")}
                        </b>
                    </Text>
                    <Text size={"tiny"} align={"right"} nowrap>
                        {t("Handler ID")}: <b>{handler.id}</b>
                    </Text>
                </Column>
            </Flex>
            {attributes && attributes.length > 0 && (
                <div className={bem("body")}>
                    {attributes?.map((attribute) => (
                        <AttributeWidget key={attribute.id} attribute={attribute} />
                    ))}
                </div>
            )}
        </Column>
    );
};

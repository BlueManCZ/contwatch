import { FC } from "react";
import { HandlerModel } from "@repo/types/HandlerModel";
import { DateTime } from "luxon";

import styles from "./HandlerWidget.module.scss";
import { bemClassNames } from "@repo/utils/bemClassNames";
import { Column } from "@repo/ui/FlexPartials";
import { Flex } from "@repo/ui/Flex";
import { Text } from "@repo/ui/Text";
import { Icon } from "@repo/ui/Icon";
import { useDataStats, useHandlerAttributes } from "@repo/utils/swrEndpoints";
import { Separator } from "@repo/ui/Separator";
import { useTranslation } from "@repo/utils/useTranslation";
import Link from "next/link";

type HandlerWidgetProps = {
    handler: HandlerModel;
};

const bem = bemClassNames(styles);

export const HandlerWidget: FC<HandlerWidgetProps> = ({ handler }) => {
    const { t } = useTranslation();
    const { data: attributes } = useHandlerAttributes(handler.id);
    const { data: dataStats } = useDataStats();

    return (
        <Column className={bem()}>
            <Flex
                className={bem("header", { color: handler.status?.toString() })}
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
                    {attributes?.map((attribute) => {
                        const minStat = dataStats?.find(
                            (stat) => stat.type === "min" && stat.attribute === attribute.id,
                        );
                        const maxStat = dataStats?.find(
                            (stat) => stat.type === "max" && stat.attribute === attribute.id,
                        );
                        return (
                            <Link
                                href={`/inspector?attribute=${attribute.id}`}
                                key={attribute.id}
                                className={bem("attribute")}
                            >
                                <Icon icon={attribute.icon ?? "circle"} variant={"circle"} />
                                <Flex alignItems={"center"} gap={".5rem"} grow wrap={"wrap"}>
                                    <Column>
                                        <Text size={"small"} weight={"bold"} nowrap>
                                            {attribute.label ?? attribute.name}{" "}
                                            {minStat?.value === attribute.data.value && (
                                                <div className={bem("peak-indicator", { color: "red" })}>
                                                    <Icon icon={"arrow-down-square"} size={13} />
                                                </div>
                                            )}
                                            {maxStat?.value === attribute.data.value && (
                                                <div className={bem("peak-indicator", { color: "green" })}>
                                                    <Icon icon={"arrow-up-square"} size={13} />
                                                </div>
                                            )}
                                            {attribute.data.trend === -1 && (
                                                <div className={bem("peak-indicator", { color: "red" })}>
                                                    <Icon icon={"arrow-right-down"} size={13} />
                                                </div>
                                            )}
                                            {attribute.data.trend === 1 && (
                                                <div className={bem("peak-indicator", { color: "green" })}>
                                                    <Icon icon={"arrow-right-up"} size={13} />
                                                </div>
                                            )}
                                        </Text>
                                        <Flex gap={"0.5rem"} wrap={"wrap"}>
                                            {minStat && (
                                                <Flex gap={"0.2rem"} alignItems={"center"}>
                                                    <Icon icon={"arrow-down-square"} size={15} />
                                                    <Text size={"tiny"}>
                                                        {minStat.value} {attribute.unit}
                                                    </Text>
                                                </Flex>
                                            )}
                                            {maxStat && (
                                                <Flex gap={"0.2rem"} alignItems={"center"}>
                                                    <Icon icon={"arrow-up-square"} size={15} />
                                                    <Text size={"tiny"}>
                                                        {maxStat.value} {attribute.unit}
                                                    </Text>
                                                </Flex>
                                            )}
                                        </Flex>
                                    </Column>
                                </Flex>
                                <Separator width={"20px"} />

                                <Text className={bem("value")} nowrap>
                                    <b>{attribute.data.value}</b> {attribute.unit}
                                </Text>
                            </Link>
                        );
                    })}
                </div>
            )}
        </Column>
    );
};

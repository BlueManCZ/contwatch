import type { AttributeModel } from "@repo/types/AttributeModel";
import { Flex } from "@repo/ui/Flex";
import { Column } from "@repo/ui/FlexPartials";
import { Icon } from "@repo/ui/Icon";
import { Separator } from "@repo/ui/Separator";
import { Text } from "@repo/ui/Text";
import { bemClassNames } from "@repo/utils/bemClassNames";
import { useDataStats } from "@repo/utils/swrEndpoints";
import Link from "next/link";
import type { FC } from "react";

import styles from "./AttributeWidget.module.scss";

type AttributeWidgetProps = {
    attribute: AttributeModel;
};

const bem = bemClassNames(styles);

export const AttributeWidget: FC<AttributeWidgetProps> = ({ attribute }) => {
    const { data: dataStats } = useDataStats();

    const minStat = dataStats?.find((stat) => stat.type === "min" && stat.attribute === attribute.id);
    const maxStat = dataStats?.find((stat) => stat.type === "max" && stat.attribute === attribute.id);
    return (
        <Link href={`/inspector?attribute=${attribute.id}`} className={bem()}>
            <Icon icon={attribute.icon ?? "circle"} variant={"circle"} />
            <Flex alignItems={"center"} gap={".5rem"} grow wrap={"wrap"}>
                <Column>
                    <Text size={"small"} weight={"bold"} nowrap>
                        {attribute.label ?? attribute.name}{" "}
                        {minStat?.value === attribute.data.value && minStat?.value !== maxStat?.value && (
                            <div className={bem("peak-indicator", { color: "red" })}>
                                <Icon icon={"arrow-down-square"} size={13} />
                            </div>
                        )}
                        {maxStat?.value === attribute.data.value && minStat?.value !== maxStat?.value && (
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
};

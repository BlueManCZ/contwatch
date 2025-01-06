import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AttributeModel } from "@repo/types/AttributeModel";
import { Flex } from "@repo/ui/Flex";
import { Column } from "@repo/ui/FlexPartials";
import { Icon } from "@repo/ui/Icon";
import { Separator } from "@repo/ui/Separator";
import { Text } from "@repo/ui/Text";
import { bemClassNames } from "@repo/utils/bemClassNames";
import { useDataStats } from "@repo/utils/swrEndpoints";
import { useRouter } from "next/navigation";
import type { FC } from "react";

import styles from "./AttributeWidget.module.scss";

type AttributeWidgetProps = {
    attribute: AttributeModel;
    editMode?: boolean;
};

const bem = bemClassNames(styles);

export const AttributeWidget: FC<AttributeWidgetProps> = ({ attribute, editMode }) => {
    const { data: dataStats } = useDataStats();

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: attribute.id,
        disabled: !editMode,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const router = useRouter();

    const minStat = dataStats?.find((stat) => stat.type === "min" && stat.attribute === attribute.id);
    const maxStat = dataStats?.find((stat) => stat.type === "max" && stat.attribute === attribute.id);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={bem({ dragging: isDragging })}
            onClick={() => {
                router.push(`/inspector?attribute=${attribute.id}`);
            }}
        >
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
        </div>
    );
};

import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { HandlerModel } from "@repo/types/HandlerModel";
import { Flex } from "@repo/ui/Flex";
import { Column } from "@repo/ui/FlexPartials";
import { Icon } from "@repo/ui/Icon";
import { Text } from "@repo/ui/Text";
import { bemClassNames } from "@repo/utils/bemClassNames";
import { executeRequest } from "@repo/utils/communication";
import { Endpoint } from "@repo/utils/endpoints";
import { getApiEndpoint } from "@repo/utils/getApiEndpoint";
import { useHandlerAttributes } from "@repo/utils/swrEndpoints";
import { useTranslation } from "@repo/utils/useTranslation";
import { DateTime } from "luxon";
import { type FC, useEffect, useState } from "react";

import { AttributeWidget } from "../AttributeWidget/AttributeWidget";
import styles from "./HandlerWidget.module.scss";

type HandlerWidgetProps = {
    handler: HandlerModel;
};

const bem = bemClassNames(styles);

export const HandlerWidget: FC<HandlerWidgetProps> = ({ handler }) => {
    const { t } = useTranslation();
    const { data: attributes } = useHandlerAttributes(handler.id);
    const [attributeIds, setAttributeIds] = useState<number[]>([]);

    useEffect(() => {
        if (attributes) {
            setAttributeIds(attributes.sort((a, b) => a.order - b.order).map((attribute) => attribute.id));
        }
    }, [attributes]);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 300,
                tolerance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setAttributeIds((items) => {
                const oldIndex = items.indexOf(active.id as number);
                const newIndex = items.indexOf(over?.id as number);

                const newItems = arrayMove(items, oldIndex, newIndex);

                executeRequest(getApiEndpoint(Endpoint.attributesSetOrder), "POST", newItems);

                return newItems;
            });
        }
    };

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
            {attributes && attributeIds && attributeIds.length > 0 && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                    onDragStart={() => {
                        navigator.vibrate?.(40);
                    }}
                >
                    <SortableContext items={attributeIds} strategy={verticalListSortingStrategy}>
                        <div className={bem("body")}>
                            {attributeIds?.map((id) => {
                                const attribute = attributes.find((attribute) => attribute.id === id);
                                return (
                                    attribute && (
                                        <AttributeWidget key={attribute.id} attribute={attribute} editMode />
                                    )
                                );
                            })}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </Column>
    );
};

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
import { Flex } from "@repo/ui/Flex";
import { Column } from "@repo/ui/FlexPartials";
import { Icon } from "@repo/ui/Icon";
import { Text } from "@repo/ui/Text";
import { bemClassNames } from "@repo/utils/bemClassNames";
import { executeRequest } from "@repo/utils/communication";
import { Endpoint } from "@repo/utils/endpoints";
import { getApiEndpoint } from "@repo/utils/getApiEndpoint";
import { useTranslation } from "@repo/utils/useTranslation";
import { DateTime } from "luxon";
import Link from "next/link";
import { type FC, useEffect, useState } from "react";
import { useSWRConfig } from "swr";

import { useHandler, useHandlerAttributes } from "../../../swrEndpoints";
import { AttributeWidget } from "../AttributeWidget/AttributeWidget";
import styles from "./HandlerWidget.module.scss";

type HandlerWidgetProps = {
    handlerId: number;
    editMode?: boolean;
};

const bem = bemClassNames(styles);

export const HandlerWidget: FC<HandlerWidgetProps> = ({ handlerId, editMode }) => {
    const { t } = useTranslation();
    const { mutate } = useSWRConfig();

    const { data: handler } = useHandler(handlerId);
    const { data: attributes } = useHandlerAttributes(handler?.id ?? 0);

    const [attributeIds, setAttributeIds] = useState<number[]>([]);

    useEffect(() => {
        if (handler?.attributes) {
            setAttributeIds(handler.attributes);
        }
    }, [handler?.attributes]);

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
        handler && (
            <Column className={bem()}>
                <Link href={`/handlers/${handler.id}`} className={bem("header", { color: handler.status })}>
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
                                        : DateTime.local()
                                              .minus({ seconds: handler.last_message })
                                              .toRelative()
                                    : t("Never")}
                            </b>
                        </Text>
                        <Text size={"tiny"} align={"right"} nowrap>
                            {t("Handler ID")}: <b>{handler.id}</b>
                        </Text>
                    </Column>
                </Link>
                {(attributeIds.length > 0 ||
                    (editMode &&
                        handler.availableAttributes.filter((attribute) =>
                            attributes?.every((a) => a.name !== attribute.name),
                        ).length > 0)) && (
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
                                {editMode && attributeIds.length > 0 && (
                                    <Flex padding={"half-rem"} margin={"horizontal-half-rem"}>
                                        <Text size={"tiny"} weight={"medium"} color={"silver"} uppercase>
                                            {t("Stored attributes")}
                                        </Text>
                                    </Flex>
                                )}
                                {attributeIds?.map((attributeId) => {
                                    return (
                                        <AttributeWidget
                                            draggable
                                            key={attributeId}
                                            handlerId={handler.id}
                                            {...{ attributeId, editMode }}
                                        />
                                    );
                                })}
                                {editMode &&
                                    handler.availableAttributes.filter((attribute) =>
                                        attributes?.every((a) => a.name !== attribute.name),
                                    ).length > 0 && (
                                        <Flex padding={"half-rem"} margin={"horizontal-half-rem"}>
                                            <Text size={"tiny"} weight={"medium"} color={"silver"} uppercase>
                                                {t("Available attributes")}
                                            </Text>
                                        </Flex>
                                    )}
                                <Column gap={".1rem"}>
                                    {editMode &&
                                        handler.availableAttributes
                                            .filter((attribute) =>
                                                attributes?.every((a) => a.name !== attribute.name),
                                            )
                                            ?.map((attribute) => {
                                                return (
                                                    <Flex
                                                        key={attribute.name}
                                                        padding={"half-rem"}
                                                        margin={"horizontal-half-rem"}
                                                        alignItems={"center"}
                                                        gap={".5rem"}
                                                    >
                                                        <Icon icon={"circle"} variant={"circle"} />
                                                        <Column grow>
                                                            <Text size={"small"} weight={"bold"} nowrap>
                                                                {attribute.name}
                                                            </Text>
                                                            <Text size={"tiny"} nowrap>
                                                                {t("Latest value")}: <b>{attribute.value}</b>
                                                            </Text>
                                                        </Column>
                                                        <Icon
                                                            icon={"plus"}
                                                            variant={"circle"}
                                                            onClick={() => {
                                                                executeRequest(
                                                                    getApiEndpoint(
                                                                        Endpoint.addHandlerAttribute,
                                                                    ),
                                                                    "POST",
                                                                    {
                                                                        handler_id: handler.id,
                                                                        attribute: attribute.name,
                                                                    },
                                                                    async () => {
                                                                        await mutate(
                                                                            `${getApiEndpoint(Endpoint.handlers)}/${handler.id}`,
                                                                        );
                                                                        await mutate(
                                                                            getApiEndpoint(
                                                                                Endpoint.attributes,
                                                                                `?handler=${handler.id}`,
                                                                            ),
                                                                        );
                                                                    },
                                                                );
                                                            }}
                                                        />
                                                    </Flex>
                                                );
                                            })}
                                </Column>
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </Column>
        )
    );
};

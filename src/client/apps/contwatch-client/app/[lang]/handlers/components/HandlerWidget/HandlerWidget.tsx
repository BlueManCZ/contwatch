"use client";

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
import type { IconType } from "@repo/types/IconType";
import { Button } from "@repo/ui/Button";
import { Flex } from "@repo/ui/Flex";
import { Column } from "@repo/ui/FlexPartials";
import { Icon } from "@repo/ui/Icon";
import { Text } from "@repo/ui/Text";
import { bemClassNames } from "@repo/utils/bemClassNames";
import { jsonFetcher } from "@repo/utils/communication";
import { useTranslation } from "@repo/utils/useTranslation";
import { DateTime } from "luxon";
import Link from "next/link";
import type { FC } from "react";
import { useModel } from "swr-models";

import { Handlers } from "../../../APIModelsDefinitions";
import { AttributeWidget } from "../AttributeWidget/AttributeWidget";
import styles from "./HandlerWidget.module.scss";

type HandlerWidgetProps = {
    handlerId: number;
    editMode?: boolean;
    attributeIcons?: IconType[];
};

const bem = bemClassNames(styles);

export const HandlerWidget: FC<HandlerWidgetProps> = ({ handlerId, editMode, attributeIcons }) => {
    const { t } = useTranslation();

    const {
        model: handler,
        set: setHandlerState,
        commit: commitHandler,
    } = useModel<HandlerModel>(Handlers, { id: handlerId });
    const attributeIds = handler?.attributes.map((a) => a.id) ?? [];

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
            setHandlerState((handler) => {
                if (!handler) return handler;

                const oldIndex = handler.attributes.findIndex((attribute) => attribute.id === active.id);
                const newIndex = handler.attributes.findIndex((attribute) => attribute.id === over?.id);

                return {
                    ...handler,
                    attributes: arrayMove(handler.attributes, oldIndex, newIndex),
                };
            });
            commitHandler();
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
                {(attributeIds.length > 0 || (editMode && handler.availableAttributes.length > 0)) && (
                    <DndContext
                        id={handler.id.toString()}
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
                                {editMode && Object.keys(handler.actions).length > 0 && (
                                    <>
                                        <Flex padding={"half-rem"} margin={"horizontal-half-rem"}>
                                            <Text size={"tiny"} weight={"medium"} color={"silver"} uppercase>
                                                {t("Available actions")}
                                            </Text>
                                        </Flex>
                                        <div style={{ padding: "0 15px 10px" }}>
                                            <Flex gap={".5rem"} wrap={"wrap"}>
                                                {Object.keys(handler.actions).map((action) => {
                                                    return (
                                                        <Button
                                                            icon={"circle"}
                                                            key={action}
                                                            grow
                                                            onClick={() => {
                                                                navigator.vibrate?.(40);
                                                                jsonFetcher(
                                                                    Handlers.endpoint({
                                                                        id: `${handler.id}/action/${action}`,
                                                                    }),
                                                                    "PUT",
                                                                );
                                                            }}
                                                        >
                                                            {handler.actions[action]?.description}
                                                        </Button>
                                                    );
                                                })}
                                            </Flex>
                                        </div>
                                    </>
                                )}
                                {editMode && attributeIds.length > 0 && (
                                    <Flex padding={"half-rem"} margin={"horizontal-half-rem"}>
                                        <Text size={"tiny"} weight={"medium"} color={"silver"} uppercase>
                                            {t("Stored attributes")}
                                        </Text>
                                    </Flex>
                                )}
                                {handler.attributes.map((bareAttribute) => {
                                    return (
                                        <AttributeWidget
                                            draggable
                                            key={bareAttribute.id}
                                            onAttributeDelete={() => {
                                                setHandlerState((handler) => {
                                                    if (!handler) return handler;

                                                    const removedAttribute = handler.attributes.find(
                                                        (attribute) => attribute.id === bareAttribute.id,
                                                    );
                                                    const newAttributes = handler.attributes.filter(
                                                        (attribute) => attribute.id !== bareAttribute.id,
                                                    );
                                                    return {
                                                        ...handler,
                                                        attributes: newAttributes,
                                                        availableAttributes: [
                                                            {
                                                                name: removedAttribute?.name ?? "",
                                                                value: "",
                                                            },
                                                            ...handler.availableAttributes,
                                                        ],
                                                    };
                                                });
                                                commitHandler();
                                            }}
                                            {...{ bareAttribute, editMode, attributeIcons }}
                                        />
                                    );
                                })}
                                {editMode && handler.availableAttributes.length > 0 && (
                                    <Flex padding={"half-rem"} margin={"horizontal-half-rem"}>
                                        <Text size={"tiny"} weight={"medium"} color={"silver"} uppercase>
                                            {t("Available attributes")}
                                        </Text>
                                    </Flex>
                                )}
                                <Column gap={".1rem"}>
                                    {editMode &&
                                        handler.availableAttributes?.map((attribute) => {
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
                                                            {t("Latest value")}:{" "}
                                                            <b>{attribute.value.toString()}</b>
                                                        </Text>
                                                    </Column>
                                                    <Icon
                                                        icon={"plus"}
                                                        variant={"circle"}
                                                        onClick={() => {
                                                            setHandlerState((handler) => {
                                                                if (!handler) return handler;

                                                                const newAttributes = [
                                                                    ...handler.attributes,
                                                                    {
                                                                        id: -1,
                                                                        name: attribute.name,
                                                                    },
                                                                ];
                                                                return {
                                                                    ...handler,
                                                                    attributes: newAttributes,
                                                                    availableAttributes:
                                                                        handler.availableAttributes.filter(
                                                                            (a) => a.name !== attribute.name,
                                                                        ),
                                                                };
                                                            });
                                                            commitHandler();
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

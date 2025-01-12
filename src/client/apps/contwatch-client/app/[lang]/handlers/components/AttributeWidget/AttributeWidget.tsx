"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AttributeModel } from "@repo/types/AttributeModel";
import type { DataStatModel } from "@repo/types/DataStatModel";
import type { IconType } from "@repo/types/IconType";
import { Button } from "@repo/ui/Button";
import { Flex } from "@repo/ui/Flex";
import { Column } from "@repo/ui/FlexPartials";
import { Icon } from "@repo/ui/Icon";
import { Input } from "@repo/ui/Input";
import { Popup } from "@repo/ui/Popup";
import { Separator } from "@repo/ui/Separator";
import { Text } from "@repo/ui/Text";
import { bemClassNames } from "@repo/utils/bemClassNames";
import { useTranslation } from "@repo/utils/useTranslation";
import { useRouter } from "next/navigation";
import { type FC, useState } from "react";

import { Attributes, DataStats } from "../../../APIModelsDefinitions";
import { useModel } from "../../../swrUtils";
import styles from "./AttributeWidget.module.scss";

type AttributeWidgetProps = {
    bareAttribute: AttributeModel;
    draggable?: boolean;
    editMode?: boolean;
    onAttributeDelete(attributeId: number): void;
};

const bem = bemClassNames(styles);

export const AttributeWidget: FC<AttributeWidgetProps> = ({
    bareAttribute,
    draggable,
    editMode,
    onAttributeDelete,
}) => {
    const { t } = useTranslation();
    const router = useRouter();

    const [editPopupOpen, setEditPopupOpen] = useState(false);

    const {
        model: attribute = bareAttribute,
        set: setAttribute,
        reset: resetAttribute,
        original: originalAttribute,
        lock: lockAttribute,
        unlock: unlockAttribute,
        commit: commitAttribute,
    } = useModel<AttributeModel>(Attributes, { id: bareAttribute.id });

    const { model: dataStats } = useModel<DataStatModel[]>(DataStats, {
        params: {
            attribute: bareAttribute.id.toString(),
        },
    });

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: bareAttribute.id,
        disabled: !draggable,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const isLoaded = attribute?.data?.trend !== undefined;
    const getAttributeName = () => {
        if (attribute.label && attribute.label !== "") {
            return attribute.label;
        }
        return attribute.name;
    };

    const minStat = dataStats?.find((stat) => stat.type === "min");
    const maxStat = dataStats?.find((stat) => stat.type === "max");

    const onPopupSave = () => {
        commitAttribute();
        setEditPopupOpen(false);
    };

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={bem({ dragging: isLoaded && isDragging, unloaded: !isLoaded })}
                onClick={() => {
                    if (editMode) {
                        if (isLoaded) {
                            setEditPopupOpen(true);
                        }
                    } else {
                        router.push(`/inspector?attribute=${bareAttribute.id}`);
                    }
                }}
            >
                <Icon icon={attribute.icon ?? "circle"} variant={"circle"} />
                <Flex alignItems={"center"} gap={".5rem"} grow wrap={"wrap"}>
                    <Column>
                        <Text size={"small"} weight={"bold"} nowrap>
                            {getAttributeName()}
                            {editMode ? (
                                attribute.unit && ` (${attribute.unit})`
                            ) : (
                                <>
                                    {minStat?.value === attribute.data?.value &&
                                        minStat?.value !== maxStat?.value && (
                                            <div className={bem("peak-indicator", { color: "red" })}>
                                                <Icon icon={"arrow-down-square"} size={13} />
                                            </div>
                                        )}
                                    {maxStat?.value === attribute.data?.value &&
                                        minStat?.value !== maxStat?.value && (
                                            <div className={bem("peak-indicator", { color: "green" })}>
                                                <Icon icon={"arrow-up-square"} size={13} />
                                            </div>
                                        )}
                                    {attribute.data?.trend === -1 && (
                                        <div className={bem("peak-indicator", { color: "red" })}>
                                            <Icon icon={"arrow-right-down"} size={13} />
                                        </div>
                                    )}
                                    {attribute.data?.trend === 1 && (
                                        <div className={bem("peak-indicator", { color: "green" })}>
                                            <Icon icon={"arrow-right-up"} size={13} />
                                        </div>
                                    )}
                                </>
                            )}
                        </Text>
                        <Flex gap={"0.5rem"} wrap={"wrap"}>
                            {editMode ? (
                                <Text size={"tiny"}>{attribute.name}</Text>
                            ) : (
                                <>
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
                                </>
                            )}
                        </Flex>
                    </Column>
                </Flex>
                <Separator width={"20px"} />

                {editMode ? (
                    <Icon icon={"edit-square"} variant={"circle"} />
                ) : (
                    <Text className={bem("value")} nowrap>
                        <b>{attribute.data?.value}</b> {attribute.unit}
                    </Text>
                )}
            </div>
            {editMode && editPopupOpen && (
                <Popup
                    visible={editPopupOpen}
                    onOpen={() => {
                        lockAttribute();
                    }}
                    onClose={() => {
                        resetAttribute();
                        unlockAttribute();
                        setEditPopupOpen(false);
                    }}
                    onEnter={onPopupSave}
                    title={originalAttribute?.label ?? originalAttribute?.name}
                >
                    <Column padding={"block"} gap={"1rem"}>
                        <Input
                            title={t("Custom label")}
                            value={attribute.label}
                            onValueChange={(value) =>
                                setAttribute((a) => {
                                    if (!a) return a;
                                    return {
                                        ...a,
                                        label: value,
                                    };
                                })
                            }
                            focus
                        />
                        <Input
                            title={t("Unit")}
                            value={attribute.unit}
                            onValueChange={(value) =>
                                setAttribute((a) => {
                                    if (!a) return a;
                                    return {
                                        ...a,
                                        unit: value,
                                    };
                                })
                            }
                        />
                        <Input
                            title={t("Icon")}
                            value={attribute.icon}
                            onValueChange={(value) =>
                                setAttribute((a) => {
                                    if (!a) return a;
                                    return {
                                        ...a,
                                        icon: value as IconType,
                                    };
                                })
                            }
                        />
                        <Separator />
                        <Flex gap={"1rem"}>
                            <Button
                                icon={"trash"}
                                slim
                                onClick={() => {
                                    // Are you sure check
                                    if (
                                        confirm(
                                            `${t("Do you want to delete attribute")} ${getAttributeName()}?`,
                                        )
                                    ) {
                                        onAttributeDelete(bareAttribute.id);
                                    }
                                }}
                                variant={"red"}
                            />

                            <Button grow onClick={onPopupSave}>
                                {t("Save")}
                            </Button>
                        </Flex>
                    </Column>
                </Popup>
            )}
        </>
    );
};

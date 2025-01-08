"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@repo/ui/Button";
import { Flex } from "@repo/ui/Flex";
import { Column } from "@repo/ui/FlexPartials";
import { Icon, type IconProps } from "@repo/ui/Icon";
import { Input } from "@repo/ui/Input";
import { Popup } from "@repo/ui/Popup";
import { Separator } from "@repo/ui/Separator";
import { Text } from "@repo/ui/Text";
import { bemClassNames } from "@repo/utils/bemClassNames";
import { executeRequest } from "@repo/utils/communication";
import { Endpoint } from "@repo/utils/endpoints";
import { getApiEndpoint } from "@repo/utils/getApiEndpoint";
import { useTranslation } from "@repo/utils/useTranslation";
import { useRouter } from "next/navigation";
import { type FC, useState } from "react";
import { useSWRConfig } from "swr";

import { Attributes, DataStats, Handlers } from "../../../APIModels";
import styles from "./AttributeWidget.module.scss";

type AttributeWidgetProps = {
    attributeId: number;
    handlerId: number;
    draggable?: boolean;
    editMode?: boolean;
};

const bem = bemClassNames(styles);

export const AttributeWidget: FC<AttributeWidgetProps> = ({
    attributeId,
    handlerId,
    draggable,
    editMode,
}) => {
    const { t } = useTranslation();
    const { mutate } = useSWRConfig();
    const { data: attribute } = Attributes.useOne(attributeId);
    const { data: dataStats } = DataStats.useAll();
    const [editPopupOpen, setEditPopupOpen] = useState(false);

    const [customLabel, setCustomLabel] = useState<string | undefined>(attribute?.label);
    const [unit, setUnit] = useState<string | undefined>(attribute?.unit);
    const [icon, setIcon] = useState<IconProps["icon"] | undefined>(attribute?.icon);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: attribute?.id ?? 0,
        disabled: !draggable,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const getAttributeName = () => {
        if (customLabel && customLabel !== "") {
            return customLabel;
        }
        return attribute?.name;
    };

    const router = useRouter();

    const minStat = dataStats?.find((stat) => stat.type === "min" && stat.attribute === attribute?.id);
    const maxStat = dataStats?.find((stat) => stat.type === "max" && stat.attribute === attribute?.id);

    return (
        attribute && (
            <>
                <div
                    ref={setNodeRef}
                    style={style}
                    {...attributes}
                    {...listeners}
                    className={bem({ dragging: isDragging })}
                    onClick={() => {
                        if (editMode) {
                            setEditPopupOpen(true);
                        } else {
                            router.push(`/inspector?attribute=${attribute.id}`);
                        }
                    }}
                >
                    <Icon icon={icon ?? "circle"} variant={"circle"} />
                    <Flex alignItems={"center"} gap={".5rem"} grow wrap={"wrap"}>
                        <Column>
                            <Text size={"small"} weight={"bold"} nowrap>
                                {getAttributeName()}
                                {editMode ? (
                                    unit && ` (${unit})`
                                ) : (
                                    <>
                                        {minStat?.value === attribute.data.value &&
                                            minStat?.value !== maxStat?.value && (
                                                <div className={bem("peak-indicator", { color: "red" })}>
                                                    <Icon icon={"arrow-down-square"} size={13} />
                                                </div>
                                            )}
                                        {maxStat?.value === attribute.data.value &&
                                            minStat?.value !== maxStat?.value && (
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
                            <b>{attribute.data.value}</b> {attribute.unit}
                        </Text>
                    )}
                </div>
                {editMode && editPopupOpen && (
                    <Popup
                        visible={editPopupOpen}
                        onClose={() => {
                            setCustomLabel(attribute.label);
                            setUnit(attribute.unit);
                            setIcon(attribute.icon);
                            setEditPopupOpen(false);
                        }}
                        title={attribute.label ?? attribute.name}
                    >
                        <Column padding={"block"} gap={"1rem"}>
                            <Input
                                title={t("Custom label")}
                                value={customLabel}
                                onValueChange={(value) => setCustomLabel(value)}
                            />
                            <Input title={t("Unit")} value={unit} onValueChange={(value) => setUnit(value)} />
                            <Input
                                title={t("Icon")}
                                value={icon}
                                onValueChange={(value) => setIcon(value as IconProps["icon"])}
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
                                            executeRequest(
                                                getApiEndpoint(Endpoint.deleteHandlerAttribute),
                                                "POST",
                                                { attribute_id: attribute.id },
                                                () => {
                                                    mutate(Handlers.endpoint(handlerId)).then(() => {
                                                        setEditPopupOpen(false);
                                                    });
                                                },
                                                () => {
                                                    alert("Error");
                                                },
                                            );
                                        }
                                    }}
                                    variant={"red"}
                                />

                                <Button
                                    grow
                                    onClick={() => {
                                        executeRequest(
                                            getApiEndpoint(Endpoint.attributesUpdate),
                                            "POST",
                                            {
                                                id: attribute.id,
                                                label: customLabel,
                                                unit,
                                                icon,
                                            },
                                            () => setEditPopupOpen(false),
                                            () => {
                                                alert("Error");
                                            },
                                        );
                                    }}
                                >
                                    {t("Save")}
                                </Button>
                            </Flex>
                        </Column>
                    </Popup>
                )}
            </>
        )
    );
};

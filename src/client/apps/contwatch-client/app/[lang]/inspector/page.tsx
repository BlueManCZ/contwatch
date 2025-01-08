"use client";

import { useLocalization } from "@repo/store/hooks/useLocalization";
import { Button } from "@repo/ui/Button";
import { Flex } from "@repo/ui/Flex";
import { Column } from "@repo/ui/FlexPartials";
import { Input } from "@repo/ui/Input";
import { Popup } from "@repo/ui/Popup";
import { Text } from "@repo/ui/Text";
import { useTranslation } from "@repo/utils/useTranslation";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Attributes } from "../APIModels";
import { InspectorChart } from "./components/InspectorChart/InspectorChart";

export default function Inspector() {
    const { t } = useTranslation();
    const { data: attributes } = Attributes.useAll();

    const { localizeDate } = useLocalization();

    const searchParams = useSearchParams();
    const paramAttribute = searchParams.get("attribute");
    const paramAttributeInt = paramAttribute ? Number.parseInt(paramAttribute) : undefined;

    /** TODO: Store selected attributes in redux */
    const [selectedAttributes, setSelectedAttributes] = useState<number[]>(
        paramAttributeInt ? [paramAttributeInt] : [],
    );
    const [selectedDate, setSelectedDate] = useState<string | undefined>(
        new Date().toISOString().split("T")[0],
    );
    const [showSettings, setShowSettings] = useState(false);

    const onAttributeClick = (id: number) => {
        setSelectedAttributes((prev) => {
            if (prev.includes(id)) {
                return prev.filter((item) => item !== id);
            }
            return [...prev, id];
        });
    };

    return (
        <>
            <Text size={"medium"} weight={"bold"}>
                {t("Inspector")} {selectedDate ? `(${localizeDate(new Date(selectedDate))})` : ""}
            </Text>
            <Popup visible={showSettings} onClose={() => setShowSettings(false)} title={t("Settings")}>
                <Column padding={"block"} gap={"2rem"}>
                    <Column gap={"1rem"}>
                        <Text weight={"bold"}>{t("Show data for date")}</Text>
                        <Flex>
                            <Input
                                type={"date"}
                                growMobile
                                value={selectedDate}
                                onValueChange={(value) => setSelectedDate(value)}
                            />
                        </Flex>
                    </Column>

                    <Column gap={"1rem"}>
                        <Text weight={"bold"}>{t("Displayed attributes")}</Text>
                        <Flex>
                            <Flex wrap={"wrap"} gap={".7rem"}>
                                {attributes?.map((attribute) => (
                                    <Button
                                        key={attribute.id}
                                        onClick={() => onAttributeClick(attribute.id)}
                                        growMobile
                                        variant={
                                            selectedAttributes.includes(attribute.id) ? "default" : "outline"
                                        }
                                    >
                                        {attribute.label ?? attribute.name}
                                    </Button>
                                ))}
                            </Flex>
                        </Flex>
                    </Column>
                </Column>
            </Popup>
            <InspectorChart
                attributes={selectedAttributes}
                date={selectedDate}
                onSettingsClick={() => setShowSettings(true)}
            />
        </>
    );
}

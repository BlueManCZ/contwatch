"use client";
import { useState } from "react";

import { Text } from "@repo/ui/Text";
import { useAttributes } from "@repo/utils/swrEndpoints";
import { Button } from "@repo/ui/Button";
import { Flex } from "@repo/ui/Flex";
import { InspectorChart } from "./components/InspectorChart/InspectorChart";
import { useTranslation } from "@repo/utils/useTranslation";
import { Popup } from "@repo/ui/Popup";
import { Column } from "@repo/ui/FlexPartials";
import { Input } from "@repo/ui/Input";
import { useSearchParams } from "next/navigation";
import { useLocalization } from "@repo/store/hooks/useLocalization";

export default function Inspector() {
    const { t } = useTranslation();
    const { data: attributes } = useAttributes();

    const { localizeDate } = useLocalization();

    const searchParams = useSearchParams();
    const paramAttribute = searchParams.get("attribute");
    const paramAttributeInt = paramAttribute ? parseInt(paramAttribute) : undefined;

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

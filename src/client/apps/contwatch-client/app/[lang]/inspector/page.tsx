"use client";

import { Button } from "@repo/ui/Button";
import { Column } from "@repo/ui/FlexPartials";
import { Popup } from "@repo/ui/Popup";
import { Text } from "@repo/ui/Text";
import { useTranslation } from "@repo/utils/useTranslation";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Handlers } from "../APIModelsDefinitions";
import { HandlerAttributes } from "./components/HandlerAttributes/HandlerAttributes";
import { InspectorChart } from "./components/InspectorChart/InspectorChart";

export default function Inspector() {
    const { t } = useTranslation();
    const { data: handlers } = Handlers.use<number[]>();

    const searchParams = useSearchParams();
    const paramAttribute = searchParams.get("attribute");
    const paramAttributeInt = paramAttribute ? Number.parseInt(paramAttribute) : undefined;

    /** TODO: Store selected attributes in redux */
    const [selectedAttributes, setSelectedAttributes] = useState<number[]>(
        paramAttributeInt ? [paramAttributeInt] : [],
    );
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0] ?? "");
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
                {t("Inspector")}
            </Text>
            <Popup
                visible={showSettings}
                onClose={() => setShowSettings(false)}
                title={t("Displayed attributes")}
            >
                <Column padding={"block"} gap={"1.5rem"}>
                    <Column wrap={"wrap"} gap={".3rem"} grow>
                        {handlers?.map((handler) => (
                            <HandlerAttributes
                                handlerId={handler}
                                key={handler}
                                {...{ selectedAttributes, onAttributeClick }}
                            />
                        ))}
                    </Column>
                    <Column gap={"1rem"}>
                        <Button
                            variant={"outline"}
                            icon={"cross"}
                            onClick={() => setSelectedAttributes([])}
                            disabled={!selectedAttributes.length}
                        >
                            {t("Reset")}
                        </Button>
                        <Button onClick={() => setShowSettings(false)}>{t("Confirm")}</Button>
                    </Column>
                </Column>
            </Popup>
            <InspectorChart
                attributes={selectedAttributes}
                date={selectedDate}
                onSettingsClick={() => setShowSettings(true)}
                onDateChange={setSelectedDate}
            />
        </>
    );
}

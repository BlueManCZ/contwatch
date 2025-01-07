"use client";

import { Text } from "@repo/ui/Text";
import { useTranslation } from "@repo/utils/useTranslation";

import { useHandlers } from "../swrEndpoints";
import { HandlersWrapper } from "./components/HandlersWrapper/HandlersWrapper";
import { HandlerWidget } from "./components/HandlerWidget/HandlerWidget";

export default function Handlers() {
    const { t } = useTranslation();
    const { data: handlers } = useHandlers();

    return (
        <>
            <Text size={"medium"} weight={"bold"}>
                {t("Handlers")}
            </Text>
            <HandlersWrapper>
                {handlers?.map((handler) => (
                    <HandlerWidget key={handler.id} {...{ handler }} />
                ))}
            </HandlersWrapper>
        </>
    );
}

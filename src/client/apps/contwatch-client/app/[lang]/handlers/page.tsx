"use client";

import { Text } from "@repo/ui/Text";
import { useTranslation } from "@repo/utils/useTranslation";

import { useHandlerIds } from "../swrEndpoints";
import { HandlersWrapper } from "./components/HandlersWrapper/HandlersWrapper";
import { HandlerWidget } from "./components/HandlerWidget/HandlerWidget";

export default function Handlers() {
    const { t } = useTranslation();
    const { data: handlerIds } = useHandlerIds(); // TODO: Remove and make this SSR

    return (
        <>
            <Text size={"medium"} weight={"bold"}>
                {t("Handlers")}
            </Text>
            <HandlersWrapper>
                {handlerIds?.map((handlerId) => (
                    <HandlerWidget key={handlerId} {...{ handlerId }} />
                ))}
            </HandlersWrapper>
        </>
    );
}

"use client";

import { Text } from "@repo/ui/Text";
import { useHandlers } from "@repo/utils/swrEndpoints";
import { HandlerWidget } from "./components/HandlerWidget/HandlerWidget";
import { useTranslation } from "@repo/utils/useTranslation";
import { HandlersWrapper } from "./components/HandlersWrapper/HandlersWrapper";

export default function Handlers() {
    const { t } = useTranslation();
    const { data: handlers } = useHandlers();

    return (
        <>
            <Text size={"medium"} weight={"bold"}>
                {t("Handlers")}
            </Text>
            <HandlersWrapper>
                {handlers?.map((handler) => <HandlerWidget key={handler.id} handler={handler} />)}
            </HandlersWrapper>
        </>
    );
}

"use client";

import { Text } from "@repo/ui/Text";
import { useTranslation } from "@repo/utils/useTranslation";
import Link from "next/link";
import type { FC } from "react";

import { useHandler } from "../../../../swrEndpoints";
import { HandlersWrapper } from "../../../components/HandlersWrapper/HandlersWrapper";
import { HandlerWidget } from "../../../components/HandlerWidget/HandlerWidget";

type PageRendererProps = {
    handlerId: number;
};

export const PageRenderer: FC<PageRendererProps> = ({ handlerId }) => {
    const { t } = useTranslation();
    const { data: handler } = useHandler(handlerId);

    return (
        <>
            <Text size={"medium"} weight={"bold"}>
                <Link href={"/handlers"}>{t("Handlers")}</Link> · {handler?.name}
            </Text>
            <HandlersWrapper>{handler && <HandlerWidget handlerId={handler.id} editMode />}</HandlersWrapper>
        </>
    );
};

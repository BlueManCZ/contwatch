import fs from "node:fs";

import type { AttributeModel } from "@repo/types/AttributeModel";
import type { HandlerModel } from "@repo/types/HandlerModel";
import type { IconType } from "@repo/types/IconType";
import type { PageParams } from "@repo/types/PageProps";
import { Text } from "@repo/ui/Text";
import { ssrTranslation } from "@repo/utils/ssrTranslation";
import Link from "next/link";
import { CustomSWRConfig } from "swr-models";

import { Attributes, Handlers } from "../../APIModelsDefinitions";
import { HandlersWrapper } from "../components/HandlersWrapper/HandlersWrapper";
import { HandlerWidget } from "../components/HandlerWidget/HandlerWidget";

type HandlersPageParams = PageParams & {
    params: Promise<{
        handlerId: string;
    }>;
};

export default async function HandlersPage({ params }: HandlersPageParams) {
    const lang = (await params).lang;
    const { t } = await ssrTranslation(lang);

    const handlerId = Number.parseInt((await params).handlerId);

    // Fetch one handler object for fallback
    const fallbackHandler = await Handlers.fetch<HandlerModel>({ id: handlerId });

    // Fetch all attribute objects for fallback
    const attributesFallback: Record<string, AttributeModel> = {};
    for (const attribute of await Attributes.fetch<AttributeModel[]>()) {
        attributesFallback[Attributes.endpoint({ id: attribute.id })] = attribute;
    }

    const attributeIcons: IconType[] = [];
    for (const file of fs.readdirSync("public/icons").filter((file) => file.endsWith(".svg"))) {
        attributeIcons.push(file.replace(".svg", "") as IconType);
    }

    return (
        <CustomSWRConfig
            value={{
                fallback: {
                    [Handlers.endpoint({ id: handlerId })]: fallbackHandler,
                    ...attributesFallback,
                },
            }}
        >
            <Text size={"medium"} weight={"bold"}>
                <Link href={"/handlers"}>{t("Handlers")}</Link> · {fallbackHandler.name}
            </Text>
            <HandlersWrapper>
                <HandlerWidget editMode {...{ handlerId, attributeIcons }} />
            </HandlersWrapper>
        </CustomSWRConfig>
    );
}

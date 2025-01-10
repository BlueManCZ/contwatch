import type { AttributeModel } from "@repo/types/AttributeModel";
import type { HandlerModel } from "@repo/types/HandlerModel";
import type { PageParams } from "@repo/types/PageProps";
import { Text } from "@repo/ui/Text";
import { ssrTranslation } from "@repo/utils/ssrTranslation";
import Link from "next/link";
import { SWRConfig } from "swr";

import { Attributes, Handlers } from "../../APIModels";
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
    const fallbackHandler = await Handlers.fetch<HandlerModel>(handlerId);

    // Fetch all attribute objects for fallback
    const attributesFallback: Record<string, AttributeModel> = {};
    for (const attribute of await Attributes.fetch<AttributeModel>()) {
        attributesFallback[Attributes.endpoint(attribute.id)] = attribute;
    }

    return (
        <SWRConfig
            value={{
                fallback: {
                    [Handlers.endpoint(handlerId)]: fallbackHandler,
                    ...attributesFallback,
                },
            }}
        >
            <Text size={"medium"} weight={"bold"}>
                <Link href={"/handlers"}>{t("Handlers")}</Link> · {fallbackHandler.name}
            </Text>
            <HandlersWrapper>
                <HandlerWidget editMode {...{ handlerId }} />
            </HandlersWrapper>
        </SWRConfig>
    );
}

import type { AttributeModel } from "@repo/types/AttributeModel";
import type { HandlerModel } from "@repo/types/HandlerModel";
import type { PageParams } from "@repo/types/PageProps";
import { Text } from "@repo/ui/Text";
import { ssrTranslation } from "@repo/utils/ssrTranslation";
import { SWRConfig } from "swr";

import { Attributes, DataStats, Handlers } from "../APIModels";
import { HandlersWrapper } from "./components/HandlersWrapper/HandlersWrapper";
import { HandlerWidget } from "./components/HandlerWidget/HandlerWidget";

export default async function PageHandlers({ params }: PageParams) {
    const lang = (await params).lang;
    const { t } = await ssrTranslation(lang);

    // Fetch all handler ids
    const handlerIds: number[] = await Handlers.fetch();

    // Fetch all handler objects for fallback
    const handlersFallback: Record<string, HandlerModel> = {};
    for (const handlerId of handlerIds) {
        handlersFallback[Handlers.endpoint(handlerId)] = await Handlers.fetch(handlerId);
    }

    // Fetch all attribute objects for fallback
    const attributesFallback: Record<string, AttributeModel> = {};
    for (const attribute of await Attributes.fetch<AttributeModel>()) {
        attributesFallback[Attributes.endpoint(attribute.id)] = attribute;
    }

    return (
        <SWRConfig
            value={{
                fallback: {
                    ...handlersFallback,
                    ...attributesFallback,
                    [DataStats.endpoint()]: await DataStats.fetch(),
                },
            }}
        >
            <Text size={"medium"} weight={"bold"}>
                {t("Handlers")}
            </Text>
            <HandlersWrapper>
                {handlerIds?.map((handlerId) => (
                    <HandlerWidget key={handlerId} {...{ handlerId }} />
                ))}
            </HandlersWrapper>
        </SWRConfig>
    );
}

import type { AttributeModel } from "@repo/types/AttributeModel";
import type { DataStatModel } from "@repo/types/DataStatModel";
import type { PageParams } from "@repo/types/PageProps";
import { Text } from "@repo/ui/Text";
import { ssrTranslation } from "@repo/utils/ssrTranslation";
import { CustomSWRConfig } from "swr-models";

import { Attributes, DataStats, Handlers } from "../APIModelsDefinitions";
import { HandlersWrapper } from "./components/HandlersWrapper/HandlersWrapper";
import { HandlerWidget } from "./components/HandlerWidget/HandlerWidget";

export default async function PageHandlers({ params }: PageParams) {
    const lang = (await params).lang;
    const { t } = await ssrTranslation(lang);

    // Fetch all handler ids
    const handlerIds: number[] = await Handlers.fetch();

    // Fetch all attribute objects for fallback
    const attributesFallback: Record<string, AttributeModel> = {};
    for (const attribute of await Attributes.fetch<AttributeModel[]>()) {
        attributesFallback[Attributes.endpoint({ id: attribute.id })] = attribute;
    }

    // Fetch data stats for fallback
    const dataStatsFallback: Record<string, DataStatModel[]> = {};
    for (const attributeId of Object.values(attributesFallback).map((a) => a.id)) {
        dataStatsFallback[DataStats.endpoint({ params: { attribute: attributeId.toString() } })] =
            await DataStats.fetch<DataStatModel[]>({ params: { attribute: attributeId.toString() } });
    }

    return (
        <CustomSWRConfig
            value={{
                fallback: {
                    ...(await Handlers.fetchFallback({ id: handlerIds })),
                    ...attributesFallback,
                    ...dataStatsFallback,
                },
            }}
        >
            <Text size={"medium"} weight={"bold"}>
                {t("Handlers")}
            </Text>
            <HandlersWrapper>
                {handlerIds?.map((handlerId) => <HandlerWidget key={handlerId} {...{ handlerId }} />)}
            </HandlersWrapper>
        </CustomSWRConfig>
    );
}

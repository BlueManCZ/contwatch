import type { AttributeModel } from "@repo/types/AttributeModel";
import type { HandlerModel } from "@repo/types/HandlerModel";
import type { PageProps } from "@repo/types/PageProps";
import { Text } from "@repo/ui/Text";
import { ssrTranslation } from "@repo/utils/ssrTranslation";
import { SWRConfig } from "swr";

import { fetchJson } from "../../../src/utils";
import { Attributes, DataStats, Handlers } from "../APIModels";
import { HandlersWrapper } from "./components/HandlersWrapper/HandlersWrapper";
import { HandlerWidget } from "./components/HandlerWidget/HandlerWidget";

export default async function PageHandlers({ params }: PageProps) {
    const lang = (await params).lang;
    const { t } = await ssrTranslation(lang);

    const handlerIds: number[] = (await fetchJson(Handlers.endpoint())) as number[];

    const handlersFallback: Record<string, HandlerModel> = {};
    for (const handlerId of handlerIds) {
        handlersFallback[Handlers.endpoint(handlerId)] = (await fetchJson(
            Handlers.endpoint(handlerId),
        )) as HandlerModel;
    }

    const attributesFallback: Record<string, AttributeModel> = {};
    for (const attribute of (await fetchJson(Attributes.endpoint())) as AttributeModel[]) {
        attributesFallback[Attributes.endpoint(attribute.id)] = attribute;
    }

    const fallback = {
        ...handlersFallback,
        ...attributesFallback,
        [DataStats.endpoint()]: await fetchJson(DataStats.endpoint()),
    };

    return (
        <>
            <Text size={"medium"} weight={"bold"}>
                {t("Handlers")}
            </Text>
            <SWRConfig
                value={{
                    fallback,
                }}
            >
                <HandlersWrapper>
                    {handlerIds?.map((handlerId) => <HandlerWidget key={handlerId} {...{ handlerId }} />)}
                </HandlersWrapper>
            </SWRConfig>
        </>
    );
}

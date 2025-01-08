import type { AttributeModel } from "@repo/types/AttributeModel";
import type { HandlerModel } from "@repo/types/HandlerModel";
import type { PageProps } from "@repo/types/PageProps";
import { Text } from "@repo/ui/Text";
import { ssrTranslation } from "@repo/utils/ssrTranslation";
import Link from "next/link";
import { SWRConfig } from "swr";

import { fetchJson } from "../../../../src/utils";
import { Attributes, Handlers } from "../../APIModels";
import { HandlersWrapper } from "../components/HandlersWrapper/HandlersWrapper";
import { HandlerWidget } from "../components/HandlerWidget/HandlerWidget";

export default async function PageHandlers({
    params,
}: PageProps & { params: Promise<{ handlerId: number }> }) {
    const lang = (await params).lang;
    const { t } = await ssrTranslation(lang);

    const handlerId = (await params).handlerId;

    const fallbackHandler = (await fetchJson(Handlers.endpoint(handlerId))) as HandlerModel;

    const attributesFallback: Record<string, AttributeModel> = {};
    for (const attribute of (await fetchJson(Attributes.endpoint())) as AttributeModel[]) {
        attributesFallback[Attributes.endpoint(attribute.id)] = attribute;
    }

    const fallback = {
        [Handlers.endpoint(handlerId)]: fallbackHandler,
        ...attributesFallback,
    };

    // console.log(JSON.stringify(fallback, null, 2));

    return (
        <SWRConfig
            value={{
                fallback,
            }}
        >
            <Text size={"medium"} weight={"bold"}>
                <Link href={"/handlers"}>{t("Handlers")}</Link> · {fallbackHandler?.name}
            </Text>
            <HandlersWrapper>
                <HandlerWidget handlerId={fallbackHandler.id} editMode />
            </HandlersWrapper>
        </SWRConfig>
    );
}

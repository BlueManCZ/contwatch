import type { PageProps } from "@repo/types/PageProps";
import { Button } from "@repo/ui/Button";
import { Flex } from "@repo/ui/Flex";
import { Text } from "@repo/ui/Text";
import { ssrTranslation } from "@repo/utils/ssrTranslation";

export default async function Overview({ params }: PageProps) {
    const lang = (await params).lang;
    const { t } = await ssrTranslation(lang);

    return (
        <>
            <Text size={"medium"} weight={"bold"}>
                {t("Overview")}
            </Text>
            <Flex>
                <Button onClick={"/handlers"}>{t("Handlers")}</Button>
            </Flex>
        </>
    );
}

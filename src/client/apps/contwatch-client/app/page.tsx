"use client";

import { Text } from "@repo/ui/Text";
import { useTranslation } from "@repo/utils/useTranslation";
import { Button } from "@repo/ui/Button";
import { Flex } from "@repo/ui/Flex";

export default function Overview() {
    // TODO: Use SSR translation and remove "use client"
    const { t } = useTranslation();

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

import type { AttributeModel } from "@repo/types/AttributeModel";
import type { HandlerModel } from "@repo/types/HandlerModel";
import { Column } from "@repo/ui/FlexPartials";
import { Text } from "@repo/ui/Text";
import type { FC } from "react";

import { Handlers } from "../../../APIModelsDefinitions";
import { AttributeCheckbox } from "../AttributeCheckbox/AttributeCheckbox";

export type HandlerAttributesProps = {
    handlerId: number;
    attributes?: AttributeModel[];
    selectedAttributes: number[];
    onAttributeClick: (attributeId: number) => void;
};

export const HandlerAttributes: FC<HandlerAttributesProps> = ({
    handlerId,
    selectedAttributes,
    onAttributeClick,
}) => {
    const { data: handler } = Handlers.use<HandlerModel>({ id: handlerId });
    return (
        <Column gap={".7rem"}>
            <Text size={"small"} weight={"bold"}>
                {(handler?.attributes.length ?? 0) > 0 && handler?.name}
            </Text>
            <Column gap={".7rem"}>
                {handler?.attributes.map((attribute) => (
                    <AttributeCheckbox
                        key={attribute.id}
                        {...{ attributeId: attribute.id, selectedAttributes, onAttributeClick }}
                    />
                ))}
            </Column>
        </Column>
    );
};

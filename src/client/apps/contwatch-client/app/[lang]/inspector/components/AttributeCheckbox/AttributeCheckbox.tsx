import type { AttributeModel } from "@repo/types/AttributeModel";
import { Input } from "@repo/ui/Input";
import type { FC } from "react";

import { Attributes } from "../../../APIModelsDefinitions";

export type AttributeCheckboxProps = {
    attributeId: number;
    selectedAttributes: number[];
    onAttributeClick: (attributeId: number) => void;
};

export const AttributeCheckbox: FC<AttributeCheckboxProps> = ({
    attributeId,
    selectedAttributes,
    onAttributeClick,
}) => {
    const { data: attribute } = Attributes.use<AttributeModel>({ id: attributeId });
    return (
        attribute && (
            <Input
                key={attribute.id}
                type={"checkbox"}
                placeholder={attribute.label ?? attribute.name}
                grow
                onCheckboxChange={() => onAttributeClick(attribute.id)}
                checked={selectedAttributes.includes(attribute.id)}
            />
        )
    );
};

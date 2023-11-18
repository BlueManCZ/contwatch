import { useState } from "react";

import { useHandlers } from "../src/bridge";
import { Button, ButtonVariant, FlexLayout, ThemedIconName, Toolbar } from "../src/components";
import { NavbarLayout } from "../src/layouts";
import { LOC_KEY, useLocalization } from "../src/localization";
import { InspectorChart } from "../src/partials/InspectorChart";

export const Inspector = () => {
    const { data: handlers } = useHandlers();
    const { translate } = useLocalization();

    /** TODO: Store selected attributes in redux */
    const [attributes, setAttributes] = useState<number[]>([]);

    const onAttributeClick = (id: number) => {
        setAttributes((prev) => {
            if (prev.includes(id)) {
                return prev.filter((item) => item !== id);
            }
            return [...prev, id];
        });
    };

    return (
        <NavbarLayout>
            <Toolbar
                icon={ThemedIconName.chartSquare}
                title={translate(LOC_KEY.INSPECTOR)}
                description={translate(LOC_KEY.INSPECTOR_INFO)}
            />
            <FlexLayout gap="1rem">
                {handlers?.map(
                    (handler) =>
                        handler.attributes?.map((attribute) => (
                            // <InspectorChart key={attribute.id} attributes={[attribute.id]} />
                            <Button
                                key={attribute.id}
                                active={attributes.includes(attribute.id)}
                                onClick={() => onAttributeClick(attribute.id)}
                                variant={ButtonVariant.white}
                            >
                                {attribute.name}
                            </Button>
                        )),
                )}
            </FlexLayout>
            <InspectorChart {...{ attributes }} />
        </NavbarLayout>
    );
};

export default Inspector;

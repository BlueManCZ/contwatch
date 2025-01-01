import { useWidgetSwitches } from "../src/bridge";
import { useAttributes } from "../src/bridge/modules/attributes";
import { AttributeWidget, FlexLayout, SwitchWidget, ThemedIconName, Toolbar } from "../src/components";
import { NavbarLayout } from "../src/layouts";
import { LOC_KEY, useLocalization } from "../src/localization";

const Dashboard = () => {
    const { localize } = useLocalization();
    const { data: attributes } = useAttributes();
    const { data: switches } = useWidgetSwitches();
    return (
        <NavbarLayout>
            <Toolbar
                icon={ThemedIconName.gridMixed}
                title={localize(LOC_KEY.DASHBOARD)}
                description={localize(LOC_KEY.DASHBOARD_INFO)}
            />
            <FlexLayout gap="20px" wrap="wrap">
                {attributes?.map((attribute) => (
                    <AttributeWidget
                        key={attribute.id}
                        title={attribute.label ?? attribute.name}
                        description={attribute.data.handler_name}
                        icon={attribute.icon}
                        unit={attribute.unit}
                        status={attribute.data.status}
                        value={attribute.data.value}
                    />
                ))}
            </FlexLayout>
            <FlexLayout gap="20px" wrap="wrap">
                {switches?.map((widget) => (
                    <SwitchWidget
                        key={widget.id}
                        id={widget.id}
                        title={widget.name}
                        description={widget.description}
                        icon={widget.icon}
                        status={widget.status}
                        active={widget.active}
                    />
                ))}
            </FlexLayout>
        </NavbarLayout>
    );
};

export default Dashboard;

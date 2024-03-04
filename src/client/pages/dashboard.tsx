import { useWidgetSwitches, useWidgetTiles } from "../src/bridge";
import { AttributeWidget, FlexLayout, SwitchWidget, ThemedIconName, Toolbar } from "../src/components";
import { NavbarLayout } from "../src/layouts";
import { LOC_KEY, useLocalization } from "../src/localization";

const Dashboard = () => {
    const { localize } = useLocalization();
    const { data: tiles } = useWidgetTiles();
    const { data: switches } = useWidgetSwitches();
    return (
        <NavbarLayout>
            <Toolbar
                icon={ThemedIconName.gridMixed}
                title={localize(LOC_KEY.DASHBOARD)}
                description={localize(LOC_KEY.DASHBOARD_INFO)}
            />
            <FlexLayout gap="20px" wrap="wrap">
                {tiles?.map((widget) => (
                    <AttributeWidget
                        key={widget.id}
                        title={widget.name}
                        description={widget.description}
                        icon={widget.icon}
                        status={widget.status}
                        unit={widget.unit}
                        value={widget.value}
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

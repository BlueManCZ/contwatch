import { useWidgetSwitches, useWidgetTiles } from "../src/bridge";
import { FlexLayout, Header, HeaderSize, Loc } from "../src/components";
import { AttributeWidget, SwitchWidget } from "../src/components/Widget";
import { NavbarLayout } from "../src/layouts";
import { GLOBAL_LOC_KEYS } from "../src/utils";

export const Dashboard = () => {
    const { data: tiles } = useWidgetTiles();
    const { data: switches } = useWidgetSwitches();
    return (
        <NavbarLayout>
            <Header size={HeaderSize.h2}>
                <Loc>{GLOBAL_LOC_KEYS.DASHBOARD}</Loc>
            </Header>
            <FlexLayout gap="20px" wrap="wrap">
                {tiles?.map((widget) => (
                    <AttributeWidget
                        key={widget.id}
                        title={widget.name}
                        description={widget.description}
                        icon={widget.icon}
                        unit={widget.unit}
                        value={widget.value}
                    />
                ))}
            </FlexLayout>
            <FlexLayout gap="20px" wrap="wrap">
                {switches?.map((widget) => (
                    <SwitchWidget
                        key={widget.id}
                        title={widget.name}
                        description={widget.description}
                        icon={widget.icon}
                        active={widget.active}
                    />
                ))}
            </FlexLayout>
        </NavbarLayout>
    );
};

export default Dashboard;

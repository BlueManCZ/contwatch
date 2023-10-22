import { useWidgets } from "../src/bridge";
import { FlexLayout, Header, HeaderSize, Loc } from "../src/components";
import { AttributeWidget } from "../src/components/Widget";
import { NavbarLayout } from "../src/layouts";
import { GLOBAL_LOC_KEYS } from "../src/utils";

export const Dashboard = () => {
    const { data: widgets } = useWidgets();
    return (
        <NavbarLayout>
            <Header size={HeaderSize.h2}>
                <Loc>{GLOBAL_LOC_KEYS.DASHBOARD}</Loc>
            </Header>
            <FlexLayout gap="20px" wrap="wrap">
                {widgets?.map((widget) => (
                    <AttributeWidget
                        key={widget.id}
                        title={widget.name}
                        description={widget.attribute}
                        value={widget.value}
                        unit={widget.unit}
                        icon={widget.icon}
                    />
                ))}
            </FlexLayout>
        </NavbarLayout>
    );
};

export default Dashboard;

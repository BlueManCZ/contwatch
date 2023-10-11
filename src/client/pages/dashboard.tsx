import { FlexLayout, Header, HeaderSize, Loc, ThemedIconName } from "../src/components";
import { AttributeWidget } from "../src/components/Widget";
import { NavbarLayout } from "../src/layouts";
import { GLOBAL_LOC_KEYS } from "../src/utils";

export const Dashboard = () => {
    return (
        <NavbarLayout>
            <Header size={HeaderSize.h2}>
                <Loc>{GLOBAL_LOC_KEYS.DASHBOARD}</Loc>
            </Header>
            <FlexLayout gap="20px" wrap="wrap">
                <AttributeWidget
                    title="Teplota na zahradě"
                    description="DHT22"
                    value="20.5"
                    unit="°C"
                    icon={ThemedIconName.air}
                />
                <AttributeWidget
                    title="Dnešní dodávka"
                    description="MUST PV1800 VHM"
                    value="1262"
                    unit="W"
                    icon={ThemedIconName.sun}
                />
                <AttributeWidget
                    title="Kapacita akumulátoru"
                    description="Jiabaida BMS V4"
                    value="23810"
                    unit="mAh"
                    icon={ThemedIconName.batteryMedium}
                />
            </FlexLayout>
        </NavbarLayout>
    );
};

export default Dashboard;

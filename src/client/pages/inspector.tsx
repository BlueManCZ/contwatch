import { Header, HeaderSize, Loc } from "../src/components";
import { NavbarLayout } from "../src/layouts";
import { GLOBAL_LOC_KEYS } from "../src/utils";

export const App = () => {
    return (
        <NavbarLayout>
            <Header size={HeaderSize.h2}>
                <Loc>{GLOBAL_LOC_KEYS.INSPECTOR}</Loc>
            </Header>
        </NavbarLayout>
    );
};

export default App;

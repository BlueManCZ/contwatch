import { InferGetStaticPropsType, NextPage } from "next";

import { Card, CardBody, CardHeader, ThemedIconName, Toolbar } from "../src/components";
import { NavbarLayout } from "../src/layouts";
import { LOC_KEY, useLocalization } from "../src/localization";
import { CommonPageProps, getCommonStaticProps } from "../src/ssrUtils";

export const getStaticProps = getCommonStaticProps;

const Settings: NextPage<CommonPageProps> = ({
    appVersion,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
    const { localize } = useLocalization();

    return (
        <NavbarLayout>
            <Toolbar
                icon={ThemedIconName.settings}
                title={localize(LOC_KEY.SETTINGS)}
                description={localize(LOC_KEY.SETTINGS_INFO)}
            />
            <Card>
                <CardHeader title={localize(LOC_KEY.SETTINGS)} />
                <CardBody>
                    <span>ContWatch version: {appVersion}</span>
                </CardBody>
            </Card>
        </NavbarLayout>
    );
};

export default Settings;

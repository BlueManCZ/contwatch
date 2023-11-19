import getConfig from "next/config";

/**
 * Returns the version of the project.
 * Use only in server-side code.
 */
export const getAppVersion = () => {
    const { serverRuntimeConfig } = getConfig();
    return serverRuntimeConfig.appVersion || "";
};

/**
 * Props that are common for all pages.
 */
export type CommonPageProps = {
    appVersion: string;
};

/**
 * Returns common static props for all pages.
 */
export const getCommonStaticProps = (): { props: CommonPageProps } => {
    return {
        props: {
            appVersion: getAppVersion(),
        },
    };
};

export const fallbackLng = "en";
export const languages = [fallbackLng, "cs"];
export const defaultNS = "translation";
export const cookieName = "i18next";

export function getOptions(lng = fallbackLng, ns = defaultNS, fallbackNS = defaultNS) {
    return {
        // debug: true,
        supportedLngs: languages,
        fallbackLng,
        lng,
        fallbackNS,
        defaultNS,
        ns: [ns, fallbackNS],
    };
}

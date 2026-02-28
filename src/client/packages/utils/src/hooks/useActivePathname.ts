import { usePathname } from "next/navigation";

import { languages } from "../i18n/settings";

/**
 * Custom hook to determine if the current pathname is active for a given href.
 * Removes the language prefix from the pathname if rendering on server with locale rewrite.
 */
export const useActivePathname = (href: string) => {
    let pn = usePathname();

    for (const lang of languages) {
        if (pn.startsWith(`/${lang}`)) {
            pn = pn.replace(`/${lang}`, "");
        }
    }

    return {
        pathname: pn,
        active: href === "/" ? pn.length < 2 : pn.startsWith(href),
    };
};

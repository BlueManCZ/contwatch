import type { i18n as I18nInstance, TFunction } from "i18next";

/**
 * Resolve the display label for an attribute.
 *
 * Priority:
 * 1. Custom user-set label (label differs from the English i18n default)
 * 2. Localized i18n label for the current locale
 * 3. Fallback to `attr.name`
 */
export function localizeAttributeLabel(
    name: string,
    label: string | null | undefined,
    t: TFunction,
    i18n: I18nInstance,
): string {
    const i18nKey = `knownAttributes.${name.replace(/[/:]/g, "_")}`;
    const englishDefault = i18n.exists(i18nKey) ? String(i18n.t(i18nKey, { lng: "en" })) : null;

    if (label) {
        // Label matches English i18n default → use current locale translation
        if (label === englishDefault) return String(t(i18nKey));
        // Custom user label → use as-is
        return label;
    }

    // No label → try i18n, fall back to raw name
    return i18n.exists(i18nKey) ? String(t(i18nKey)) : name;
}

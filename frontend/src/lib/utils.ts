import { type ClassValue, clsx } from "clsx";
import type { ReactNode } from "react";
import { createElement } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Render an i18n template with `{{name}}` interpolated as a bold span.
 * Uses a sentinel so the translated string keeps its natural word order.
 */
export function boldName(
    t: (key: string, opts: Record<string, string>) => string,
    key: string,
    name: string,
): ReactNode {
    const sentinel = "\x00";
    const rendered = t(key, { name: sentinel });
    const [before, after] = rendered.split(sentinel);
    return createElement("span", null, before, createElement("b", null, name), after);
}

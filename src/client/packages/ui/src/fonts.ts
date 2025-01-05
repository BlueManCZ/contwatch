import type { NextFont } from "next/dist/compiled/@next/font";
import { Open_Sans, Source_Code_Pro } from "next/font/google";

export const openSans = Open_Sans({
    subsets: ["latin"],
    display: "swap",
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-family-cantarell",
});

export const sourceCodePro = Source_Code_Pro({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-family-source-code-pro",
});

export type Font = "open-sans" | "source-code-pro";

export const fontDefinitions: Record<Font, NextFont> = {
    "open-sans": openSans,
    "source-code-pro": sourceCodePro,
};

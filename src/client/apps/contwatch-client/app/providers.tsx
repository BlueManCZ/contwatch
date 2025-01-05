"use client";

import { StoreProvider } from "@repo/store/StoreProvider";
// import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";

export function Providers({ children }: PropsWithChildren) {
    return (
        // <ThemeProvider
        //     defaultTheme="system"
        //     themeColor={{
        //         light: "hsl(0 0% 100%)",
        //         dark: "hsl(216 13% 15%)",
        //     }}
        //     enableSystem
        // >
        <StoreProvider>{children}</StoreProvider>
        // </ThemeProvider>
    );
}

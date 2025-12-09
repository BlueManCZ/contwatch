import { StoreProvider } from "@repo/store/StoreProvider";
// import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";

export function Providers({ children, lang }: PropsWithChildren<{ lang: string }>) {
    return (
        // <ThemeProvider
        //     defaultTheme="system"
        //     themeColor={{
        //         light: "hsl(0 0% 100%)",
        //         dark: "hsl(216 13% 15%)",
        //     }}
        //     enableSystem
        // >
        // TODO: Disable devTools in production
        <StoreProvider lang={lang} devTools={true}>
            {children}
        </StoreProvider>
        // </ThemeProvider>
    );
}

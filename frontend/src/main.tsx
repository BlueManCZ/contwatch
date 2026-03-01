import "@/globals.css";

import { createRouter, RouterProvider } from "@tanstack/react-router";
import React, { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import i18n from "@/i18n/config";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { useSettingsStore } from "@/stores/settings";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
    routeTree,
    context: {
        auth: { user: null, isLoading: true, waitUntilReady: () => Promise.resolve() },
    },
});

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

function ThemeSync() {
    const theme = useSettingsStore((s) => s.theme);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("dark", theme === "dark");
        root.classList.toggle("light", theme === "light");
    }, [theme]);

    return null;
}

function LocaleSync() {
    const locale = useSettingsStore((s) => s.locale);

    useEffect(() => {
        if (locale === "auto") {
            const browserLang = navigator.language.split("-")[0];
            i18n.changeLanguage(browserLang);
        } else {
            i18n.changeLanguage(locale);
        }
    }, [locale]);

    return null;
}

function InnerApp() {
    const auth = useAuth();
    const routerMounted = React.useRef(false);

    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run on user change
    React.useEffect(() => {
        if (routerMounted.current) {
            router.invalidate();
        }
    }, [auth.user]);

    if (auth.isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    routerMounted.current = true;
    return <RouterProvider router={router} context={{ auth }} />;
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element in index.html");

createRoot(root).render(
    <StrictMode>
        <QueryProvider>
            <AuthProvider>
                <ThemeSync />
                <LocaleSync />
                <InnerApp />
            </AuthProvider>
        </QueryProvider>
    </StrictMode>,
);

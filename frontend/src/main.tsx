import "@/globals.css";
import "@/i18n/config";

import { createRouter, RouterProvider } from "@tanstack/react-router";
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
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

function InnerApp() {
    const auth = useAuth();
    const routerMounted = React.useRef(false);

    // Re-evaluate route guards whenever auth state changes,
    // but only after RouterProvider has mounted to avoid evaluating
    // routes with stale initial context.
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-run on user change
    React.useEffect(() => {
        if (routerMounted.current) {
            router.invalidate();
        }
    }, [auth.user]);

    if (auth.isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
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
                <InnerApp />
            </AuthProvider>
        </QueryProvider>
    </StrictMode>,
);

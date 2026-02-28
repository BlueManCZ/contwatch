import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";

interface RouterContext {
    auth: {
        user: { id: number; username: string; role: string } | null;
        isLoading: boolean;
        waitUntilReady: () => Promise<void>;
    };
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: () => (
        <>
            <Outlet />
            <Toaster position="bottom-right" richColors />
            <TanStackRouterDevtools position="bottom-right" />
        </>
    ),
});

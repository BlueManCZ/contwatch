import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "sonner";
import { NotFound } from "@/components/not-found";
import { RouteError } from "@/components/route-error";
import { useSettingsStore } from "@/stores/settings";

interface RouterContext {
    auth: {
        user: { id: number; username: string; role: string } | null;
        isLoading: boolean;
        waitUntilReady: () => Promise<void>;
    };
}

function RootComponent() {
    const theme = useSettingsStore((s) => s.theme);
    return (
        <>
            <Outlet />
            <Toaster position="bottom-right" richColors theme={theme} />
            {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
        </>
    );
}

export const Route = createRootRouteWithContext<RouterContext>()({
    component: RootComponent,
    notFoundComponent: NotFound,
    errorComponent: RouteError,
});

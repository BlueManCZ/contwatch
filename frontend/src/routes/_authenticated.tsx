import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/app-layout";
import { RouteError } from "@/components/route-error";
import { useSeedHandlerStatuses } from "@/hooks/use-seed-handler-statuses";
import { useSeedLiveValues } from "@/hooks/use-seed-live-values";
import { useSocketConnection } from "@/providers/socket-provider";

export const Route = createFileRoute("/_authenticated")({
    async beforeLoad({ context }) {
        // Wait for auth to finish loading before checking
        if (context.auth.isLoading) {
            await context.auth.waitUntilReady();
        }
        if (!context.auth.user) {
            throw redirect({
                to: "/login",
                search: { redirect: location.pathname + location.search },
            });
        }
    },
    component: AuthenticatedLayout,
    errorComponent: RouteError,
});

function AuthenticatedLayout() {
    useSocketConnection();
    useSeedLiveValues();
    useSeedHandlerStatuses();

    return (
        <AppLayout>
            <Outlet />
        </AppLayout>
    );
}

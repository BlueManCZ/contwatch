import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/app-layout";
import { useSeedLiveValues } from "@/hooks/use-seed-live-values";
import { useSocketMutationInvalidation } from "@/providers/socket-provider";

export const Route = createFileRoute("/_authenticated")({
    async beforeLoad({ context }) {
        // Wait for auth to finish loading before checking
        if (context.auth.isLoading) {
            await context.auth.waitUntilReady();
        }
        if (!context.auth.user) {
            throw redirect({ to: "/login" });
        }
    },
    component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
    useSocketMutationInvalidation();
    useSeedLiveValues();

    return (
        <AppLayout>
            <Outlet />
        </AppLayout>
    );
}

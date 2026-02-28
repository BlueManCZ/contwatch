import { createFileRoute, redirect } from "@tanstack/react-router";
import { UserManagement } from "@/components/admin/user-management";

export const Route = createFileRoute("/_authenticated/admin")({
    beforeLoad({ context }) {
        if (context.auth.user?.role !== "admin") {
            throw redirect({ to: "/" });
        }
    },
    component: UserManagement,
});

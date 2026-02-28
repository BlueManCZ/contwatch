import { createFileRoute } from "@tanstack/react-router";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";

export const Route = createFileRoute("/_authenticated/")({
    component: DashboardPage,
});

function DashboardPage() {
    return <DashboardGrid />;
}

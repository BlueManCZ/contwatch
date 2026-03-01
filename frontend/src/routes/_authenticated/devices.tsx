import { createFileRoute } from "@tanstack/react-router";
import { HandlerList } from "@/components/handlers/handler-list";

export const Route = createFileRoute("/_authenticated/devices")({
    component: DevicesPage,
});

function DevicesPage() {
    return <HandlerList />;
}

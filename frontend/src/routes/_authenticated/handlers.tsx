import { createFileRoute } from "@tanstack/react-router";
import { HandlerList } from "@/components/handlers/handler-list";

export const Route = createFileRoute("/_authenticated/handlers")({
    component: HandlersPage,
});

function HandlersPage() {
    return <HandlerList />;
}

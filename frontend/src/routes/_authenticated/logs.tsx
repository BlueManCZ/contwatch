import { createFileRoute } from "@tanstack/react-router";
import { LogViewer } from "@/components/logs/log-viewer";

export const Route = createFileRoute("/_authenticated/logs")({
    component: LogViewer,
});

import { createFileRoute } from "@tanstack/react-router";
import { InspectorView } from "@/components/inspector/inspector-view";

type InspectorSearch = {
    attributes?: string;
    date?: string;
};

export const Route = createFileRoute("/_authenticated/inspector")({
    component: InspectorPage,
    validateSearch: (search: Record<string, unknown>): InspectorSearch => ({
        attributes: typeof search.attributes === "string" ? search.attributes : undefined,
        date: typeof search.date === "string" ? search.date : undefined,
    }),
});

function InspectorPage() {
    const { attributes, date } = Route.useSearch();
    return <InspectorView attributesParam={attributes} dateParam={date} />;
}

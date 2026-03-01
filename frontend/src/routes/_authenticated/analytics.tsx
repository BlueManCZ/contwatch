import { createFileRoute } from "@tanstack/react-router";
import { InspectorView } from "@/components/inspector/inspector-view";

type AnalyticsSearch = {
    attributes?: string;
    date?: string;
};

export const Route = createFileRoute("/_authenticated/analytics")({
    component: AnalyticsPage,
    validateSearch: (search: Record<string, unknown>): AnalyticsSearch => ({
        attributes: typeof search.attributes === "string" ? search.attributes : undefined,
        date: typeof search.date === "string" ? search.date : undefined,
    }),
});

function AnalyticsPage() {
    const { attributes, date } = Route.useSearch();
    return <InspectorView attributesParam={attributes} dateParam={date} />;
}

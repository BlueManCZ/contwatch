import { createFileRoute } from "@tanstack/react-router";
import { InspectorView } from "@/components/inspector/inspector-view";

type AnalyticsSearch = {
    attributes?: string;
    date?: string;
    view?: "daily";
    days?: number;
};

export const Route = createFileRoute("/_authenticated/analytics")({
    component: AnalyticsPage,
    validateSearch: (search: Record<string, unknown>): AnalyticsSearch => ({
        attributes: typeof search.attributes === "string" ? search.attributes : undefined,
        date: typeof search.date === "string" ? search.date : undefined,
        view: search.view === "daily" ? "daily" : undefined,
        days: typeof search.days === "number" ? search.days : undefined,
    }),
});

function AnalyticsPage() {
    const { attributes, date, view, days } = Route.useSearch();
    return <InspectorView attributesParam={attributes} dateParam={date} viewParam={view} daysParam={days} />;
}

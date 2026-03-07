import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { DashboardWidget } from "@/api/generated/contWatchAPI.schemas";
import {
    getDashboardApiWidgetsDashboardGetQueryKey,
    useDashboardApiWidgetsDashboardGet,
    useDeleteWidgetApiWidgetsWidgetIdDelete,
    useReorderWidgetsApiWidgetsReorderPost,
} from "@/api/generated/widgets/widgets";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EditWidgetDialog } from "@/components/dashboard/edit-widget-dialog";
import { WidgetButton } from "@/components/dashboard/widget-button";
import { WidgetSlider } from "@/components/dashboard/widget-slider";
import { WidgetSparkline } from "@/components/dashboard/widget-sparkline";
import { WidgetSwitch } from "@/components/dashboard/widget-switch";
import { WidgetTile } from "@/components/dashboard/widget-tile";
import { WidgetWizard } from "@/components/dashboard/widget-wizard";
import { SortableList } from "@/components/handlers/sortable-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContent, PageHeader } from "@/components/layout/page-header";
import { getWidgetStatus } from "@/lib/widget-status";
import { useHandlerStatusStore } from "@/stores/handler-status";

export function DashboardGrid() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { data } = useDashboardApiWidgetsDashboardGet();
    const deleteWidget = useDeleteWidgetApiWidgetsWidgetIdDelete();
    const reorderWidgets = useReorderWidgetsApiWidgetsReorderPost();
    const navigate = useNavigate();
    const [editing, setEditing] = useState<DashboardWidget | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const handlerStatuses = useHandlerStatusStore((s) => s.statuses);

    const statusOf = (w: DashboardWidget) =>
        getWidgetStatus(
            w.handler_id ? handlerStatuses[w.handler_id] : undefined,
            w.handler_running,
            w.handler_connected,
        );

    const widgets = data?.data ?? [];
    const isEmpty = widgets.length === 0;

    function renderWidget(w: DashboardWidget) {
        const status = statusOf(w);
        const common = {
            key: w.id,
            onEdit: () => setEditing(w),
            onRemove: () => setPendingDeleteId(w.id),
        };

        switch (w.type) {
            case "tile":
                return (
                    <WidgetTile
                        {...common}
                        widget={w}
                        status={status}
                        onClick={() =>
                            navigate({
                                to: "/analytics",
                                search: { attributes: String(w.attribute_id) },
                            })
                        }
                    />
                );
            case "switch":
                return <WidgetSwitch {...common} widget={w} status={status} />;
            case "slider":
                return <WidgetSlider {...common} widget={w} status={status} />;
            case "button":
                return <WidgetButton {...common} widget={w} status={status} />;
            case "sparkline":
                return (
                    <WidgetSparkline
                        {...common}
                        widget={w}
                        status={status}
                        onClick={() =>
                            navigate({
                                to: "/analytics",
                                search: {
                                    attributes: String(w.attribute_id),
                                    view: "daily",
                                },
                            })
                        }
                    />
                );
            default:
                return null;
        }
    }

    return (
        <>
            <PageHeader title={t("dashboard.title")} actions={<WidgetWizard />} />
            <PageContent>
                {isEmpty ? (
                    <EmptyState
                        icon={LayoutGrid}
                        title={t("dashboard.noWidgets")}
                        description={t("dashboard.noWidgetsDescription")}
                        action={<WidgetWizard />}
                    />
                ) : (
                    <SortableList
                        items={widgets}
                        multiColumn
                        onLongPress={(w) => setEditing(w)}
                        onReorder={(reordered) => {
                            const items = reordered.map((w, i) => ({ id: w.id, order: i }));
                            reorderWidgets.mutate(
                                { data: { items } },
                                {
                                    onSuccess: () => {
                                        queryClient.invalidateQueries({
                                            queryKey: getDashboardApiWidgetsDashboardGetQueryKey(),
                                        });
                                    },
                                },
                            );
                        }}
                        className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        renderItem={(w) => renderWidget(w)}
                    />
                )}

                {editing && (
                    <EditWidgetDialog
                        widget={editing}
                        open={!!editing}
                        onOpenChange={(open) => {
                            if (!open) setEditing(null);
                        }}
                        onRemove={() => setPendingDeleteId(editing.id)}
                    />
                )}

                <ConfirmDialog
                    open={pendingDeleteId !== null}
                    onOpenChange={(open) => {
                        if (!open) setPendingDeleteId(null);
                    }}
                    isPending={deleteWidget.isPending}
                    onConfirm={() => {
                        if (pendingDeleteId === null) return;
                        deleteWidget.mutate(
                            { widgetId: pendingDeleteId },
                            {
                                onSuccess: () => {
                                    setPendingDeleteId(null);
                                    setEditing(null);
                                    queryClient.invalidateQueries({
                                        queryKey: getDashboardApiWidgetsDashboardGetQueryKey(),
                                    });
                                    toast.success(t("toast.widgetRemoved"));
                                },
                            },
                        );
                    }}
                    description={t("confirm.removeWidget")}
                    variant="destructive"
                    confirmLabel={t("confirm.remove")}
                />
            </PageContent>
        </>
    );
}

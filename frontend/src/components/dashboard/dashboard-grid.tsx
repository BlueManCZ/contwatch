import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { DashboardSlider, DashboardSwitch, DashboardTile } from "@/api/generated/contWatchAPI.schemas";
import {
    getListSlidersApiWidgetsSlidersGetQueryKey,
    getListSwitchesApiWidgetsSwitchesGetQueryKey,
    getListTilesApiWidgetsTilesGetQueryKey,
    useDashboardApiWidgetsDashboardGet,
    useDeleteSliderApiWidgetsSlidersSliderIdDelete,
    useDeleteSwitchApiWidgetsSwitchesSwitchIdDelete,
    useDeleteTileApiWidgetsTilesTileIdDelete,
} from "@/api/generated/widgets/widgets";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EditSliderDialog } from "@/components/dashboard/edit-slider-dialog";
import { EditSwitchDialog } from "@/components/dashboard/edit-switch-dialog";
import { EditTileDialog } from "@/components/dashboard/edit-tile-dialog";
import { WidgetSlider } from "@/components/dashboard/widget-slider";
import { WidgetSwitch } from "@/components/dashboard/widget-switch";
import { WidgetTile } from "@/components/dashboard/widget-tile";
import { WidgetWizard } from "@/components/dashboard/widget-wizard";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContent, PageHeader } from "@/components/layout/page-header";
import { getWidgetStatus } from "@/lib/widget-status";
import { useHandlerStatusStore } from "@/stores/handler-status";

export function DashboardGrid() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { data } = useDashboardApiWidgetsDashboardGet();
    const deleteTile = useDeleteTileApiWidgetsTilesTileIdDelete();
    const deleteSwitch = useDeleteSwitchApiWidgetsSwitchesSwitchIdDelete();
    const deleteSlider = useDeleteSliderApiWidgetsSlidersSliderIdDelete();
    const navigate = useNavigate();
    const [editingTile, setEditingTile] = useState<DashboardTile | null>(null);
    const [editingSwitch, setEditingSwitch] = useState<DashboardSwitch | null>(null);
    const [editingSlider, setEditingSlider] = useState<DashboardSlider | null>(null);
    const [pendingDelete, setPendingDelete] = useState<{
        type: "tile" | "switch" | "slider";
        id: number;
    } | null>(null);
    const handlerStatuses = useHandlerStatusStore((s) => s.statuses);

    const statusOf = (handlerId: number, apiRunning?: boolean, apiConnected?: boolean) =>
        getWidgetStatus(handlerStatuses[handlerId], apiRunning, apiConnected);

    const tiles = data?.data?.tiles ?? [];
    const switches = data?.data?.switches ?? [];
    const sliders = data?.data?.sliders ?? [];
    const isEmpty = tiles.length === 0 && switches.length === 0 && sliders.length === 0;

    return (
        <>
            <PageHeader title={t("dashboard.title")} actions={<WidgetWizard />} />
            <PageContent className="space-y-5">
                {isEmpty ? (
                    <EmptyState
                        icon={LayoutGrid}
                        title={t("dashboard.noWidgets")}
                        description={t("dashboard.noWidgetsDescription")}
                        action={<WidgetWizard />}
                    />
                ) : (
                    <>
                        {/* Monitoring section */}
                        {tiles.length > 0 && (
                            <section>
                                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
                                    {t("nav.monitoring")}
                                </h2>
                                <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {tiles.map((tile) => (
                                        <WidgetTile
                                            key={tile.id}
                                            tile={tile}
                                            status={statusOf(
                                                tile.handler_id,
                                                tile.handler_running,
                                                tile.handler_connected,
                                            )}
                                            onEdit={() => setEditingTile(tile)}
                                            onRemove={() => setPendingDelete({ type: "tile", id: tile.id })}
                                            onClick={() =>
                                                navigate({
                                                    to: "/analytics",
                                                    search: { attributes: String(tile.attribute_id) },
                                                })
                                            }
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Controls section */}
                        {(switches.length > 0 || sliders.length > 0) && (
                            <section>
                                <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
                                    {t("nav.controls")}
                                </h2>
                                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {switches.map((sw) => (
                                        <WidgetSwitch
                                            key={`sw-${sw.id}`}
                                            switch_={sw}
                                            status={statusOf(
                                                sw.handler_id,
                                                sw.handler_running,
                                                sw.handler_connected,
                                            )}
                                            onEdit={() => setEditingSwitch(sw)}
                                            onRemove={() => setPendingDelete({ type: "switch", id: sw.id })}
                                        />
                                    ))}
                                    {sliders.map((sl) => (
                                        <WidgetSlider
                                            key={`sl-${sl.id}`}
                                            slider={sl}
                                            status={statusOf(
                                                sl.handler_id,
                                                sl.handler_running,
                                                sl.handler_connected,
                                            )}
                                            onEdit={() => setEditingSlider(sl)}
                                            onRemove={() => setPendingDelete({ type: "slider", id: sl.id })}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}

                {editingTile && (
                    <EditTileDialog
                        tile={editingTile}
                        open={!!editingTile}
                        onOpenChange={(open) => {
                            if (!open) setEditingTile(null);
                        }}
                        onRemove={() => setPendingDelete({ type: "tile", id: editingTile.id })}
                    />
                )}

                {editingSwitch && (
                    <EditSwitchDialog
                        switch_={editingSwitch}
                        open={!!editingSwitch}
                        onOpenChange={(open) => {
                            if (!open) setEditingSwitch(null);
                        }}
                        onRemove={() => setPendingDelete({ type: "switch", id: editingSwitch.id })}
                    />
                )}

                {editingSlider && (
                    <EditSliderDialog
                        slider={editingSlider}
                        open={!!editingSlider}
                        onOpenChange={(open) => {
                            if (!open) setEditingSlider(null);
                        }}
                        onRemove={() => setPendingDelete({ type: "slider", id: editingSlider.id })}
                    />
                )}

                <ConfirmDialog
                    open={pendingDelete !== null}
                    onOpenChange={(open) => {
                        if (!open) setPendingDelete(null);
                    }}
                    onConfirm={() => {
                        if (!pendingDelete) return;
                        const { type, id } = pendingDelete;
                        const config = {
                            tile: {
                                mutate: deleteTile,
                                param: { tileId: id },
                                queryKey: getListTilesApiWidgetsTilesGetQueryKey(),
                                toastKey: "toast.tileRemoved",
                                clearEditing: () => setEditingTile(null),
                            },
                            switch: {
                                mutate: deleteSwitch,
                                param: { switchId: id },
                                queryKey: getListSwitchesApiWidgetsSwitchesGetQueryKey(),
                                toastKey: "toast.switchRemoved",
                                clearEditing: () => setEditingSwitch(null),
                            },
                            slider: {
                                mutate: deleteSlider,
                                param: { sliderId: id },
                                queryKey: getListSlidersApiWidgetsSlidersGetQueryKey(),
                                toastKey: "toast.sliderRemoved",
                                clearEditing: () => setEditingSlider(null),
                            },
                        }[type];
                        config.mutate.mutate(config.param as never, {
                            onSuccess: () => {
                                setPendingDelete(null);
                                queryClient.invalidateQueries({ queryKey: config.queryKey });
                                toast.success(t(config.toastKey));
                                config.clearEditing();
                            },
                        });
                    }}
                    description={t(
                        `confirm.remove${pendingDelete ? pendingDelete.type.charAt(0).toUpperCase() + pendingDelete.type.slice(1) : "Tile"}`,
                    )}
                    confirmLabel={t("confirm.remove")}
                />
            </PageContent>
        </>
    );
}

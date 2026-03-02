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
import { type WidgetStatus, WidgetTile } from "@/components/dashboard/widget-tile";
import { WidgetWizard } from "@/components/dashboard/widget-wizard";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
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
    const [pendingDeleteTileId, setPendingDeleteTileId] = useState<number | null>(null);
    const [pendingDeleteSwitchId, setPendingDeleteSwitchId] = useState<number | null>(null);
    const [pendingDeleteSliderId, setPendingDeleteSliderId] = useState<number | null>(null);
    const handlerStatuses = useHandlerStatusStore((s) => s.statuses);

    const getWidgetStatus = (
        handlerId: number,
        apiRunning?: boolean,
        apiConnected?: boolean,
    ): WidgetStatus => {
        const live = handlerStatuses[handlerId];
        const running = live?.running ?? apiRunning ?? false;
        const connected = live?.connected ?? apiConnected ?? false;
        if (!running) return "offline";
        if (!connected) return "warning";
        return "online";
    };

    const tiles = data?.data?.tiles ?? [];
    const switches = data?.data?.switches ?? [];
    const sliders = data?.data?.sliders ?? [];
    const isEmpty = tiles.length === 0 && switches.length === 0 && sliders.length === 0;

    return (
        <div className="space-y-5">
            <PageHeader title={t("dashboard.title")} actions={<WidgetWizard />} />

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
                                        status={getWidgetStatus(
                                            tile.handler_id,
                                            tile.handler_running,
                                            tile.handler_connected,
                                        )}
                                        onEdit={() => setEditingTile(tile)}
                                        onRemove={() => setPendingDeleteTileId(tile.id)}
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
                                        status={getWidgetStatus(
                                            sw.handler_id,
                                            sw.handler_running,
                                            sw.handler_connected,
                                        )}
                                        onEdit={() => setEditingSwitch(sw)}
                                        onRemove={() => setPendingDeleteSwitchId(sw.id)}
                                    />
                                ))}
                                {sliders.map((sl) => (
                                    <WidgetSlider
                                        key={`sl-${sl.id}`}
                                        slider={sl}
                                        status={getWidgetStatus(
                                            sl.handler_id,
                                            sl.handler_running,
                                            sl.handler_connected,
                                        )}
                                        onEdit={() => setEditingSlider(sl)}
                                        onRemove={() => setPendingDeleteSliderId(sl.id)}
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
                    onRemove={() => setPendingDeleteTileId(editingTile.id)}
                />
            )}

            {editingSwitch && (
                <EditSwitchDialog
                    switch_={editingSwitch}
                    open={!!editingSwitch}
                    onOpenChange={(open) => {
                        if (!open) setEditingSwitch(null);
                    }}
                    onRemove={() => setPendingDeleteSwitchId(editingSwitch.id)}
                />
            )}

            {editingSlider && (
                <EditSliderDialog
                    slider={editingSlider}
                    open={!!editingSlider}
                    onOpenChange={(open) => {
                        if (!open) setEditingSlider(null);
                    }}
                    onRemove={() => setPendingDeleteSliderId(editingSlider.id)}
                />
            )}

            <ConfirmDialog
                open={pendingDeleteTileId !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingDeleteTileId(null);
                }}
                onConfirm={() => {
                    if (pendingDeleteTileId === null) return;
                    deleteTile.mutate(
                        { tileId: pendingDeleteTileId },
                        {
                            onSuccess: () => {
                                queryClient.invalidateQueries({
                                    queryKey: getListTilesApiWidgetsTilesGetQueryKey(),
                                });
                                toast.success(t("toast.tileRemoved"));
                                setEditingTile(null);
                            },
                        },
                    );
                }}
                description={t("confirm.removeTile")}
                confirmLabel={t("confirm.remove")}
            />
            <ConfirmDialog
                open={pendingDeleteSwitchId !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingDeleteSwitchId(null);
                }}
                onConfirm={() => {
                    if (pendingDeleteSwitchId === null) return;
                    deleteSwitch.mutate(
                        { switchId: pendingDeleteSwitchId },
                        {
                            onSuccess: () => {
                                queryClient.invalidateQueries({
                                    queryKey: getListSwitchesApiWidgetsSwitchesGetQueryKey(),
                                });
                                toast.success(t("toast.switchRemoved"));
                                setEditingSwitch(null);
                            },
                        },
                    );
                }}
                description={t("confirm.removeSwitch")}
                confirmLabel={t("confirm.remove")}
            />
            <ConfirmDialog
                open={pendingDeleteSliderId !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingDeleteSliderId(null);
                }}
                onConfirm={() => {
                    if (pendingDeleteSliderId === null) return;
                    deleteSlider.mutate(
                        { sliderId: pendingDeleteSliderId },
                        {
                            onSuccess: () => {
                                queryClient.invalidateQueries({
                                    queryKey: getListSlidersApiWidgetsSlidersGetQueryKey(),
                                });
                                toast.success(t("toast.sliderRemoved"));
                                setEditingSlider(null);
                            },
                        },
                    );
                }}
                description={t("confirm.removeSlider")}
                confirmLabel={t("confirm.remove")}
            />
        </div>
    );
}

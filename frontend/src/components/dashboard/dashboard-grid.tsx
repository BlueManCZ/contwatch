import { LayoutGrid, Plus, ToggleLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { DashboardSwitch, DashboardTile } from "@/api/generated/contWatchAPI.schemas";
import {
    useDashboardApiWidgetsDashboardGet,
    useDeleteSwitchApiWidgetsSwitchesSwitchIdDelete,
    useDeleteTileApiWidgetsTilesTileIdDelete,
} from "@/api/generated/widgets/widgets";
import { AddSwitchDialog } from "@/components/dashboard/add-switch-dialog";
import { AddTileDialog } from "@/components/dashboard/add-tile-dialog";
import { EditSwitchDialog } from "@/components/dashboard/edit-switch-dialog";
import { EditTileDialog } from "@/components/dashboard/edit-tile-dialog";
import { TileChartDialog } from "@/components/dashboard/tile-chart-dialog";
import { WidgetSwitch } from "@/components/dashboard/widget-switch";
import { type WidgetStatus, WidgetTile } from "@/components/dashboard/widget-tile";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHandlerStatusStore } from "@/stores/handler-status";

export function DashboardGrid() {
    const { t } = useTranslation();
    const { data } = useDashboardApiWidgetsDashboardGet();
    const deleteTile = useDeleteTileApiWidgetsTilesTileIdDelete();
    const deleteSwitch = useDeleteSwitchApiWidgetsSwitchesSwitchIdDelete();
    const [selectedTile, setSelectedTile] = useState<DashboardTile | null>(null);
    const [editingTile, setEditingTile] = useState<DashboardTile | null>(null);
    const [editingSwitch, setEditingSwitch] = useState<DashboardSwitch | null>(null);
    const [addTileOpen, setAddTileOpen] = useState(false);
    const [addSwitchOpen, setAddSwitchOpen] = useState(false);
    const handlerStatuses = useHandlerStatusStore((s) => s.statuses);

    const getWidgetStatus = (handlerId: number, apiRunning = true, apiConnected = true): WidgetStatus => {
        const live = handlerStatuses[handlerId];
        const running = live?.running ?? apiRunning;
        const connected = live?.connected ?? apiConnected;
        if (!running) return "offline";
        if (!connected) return "warning";
        return "online";
    };

    const tiles = data?.data?.tiles ?? [];
    const switches = data?.data?.switches ?? [];
    const isEmpty = tiles.length === 0 && switches.length === 0;

    return (
        <div className="space-y-5">
            <PageHeader
                title={t("dashboard.title")}
                actions={
                    <>
                        {/* Desktop: inline buttons */}
                        <div className="hidden sm:flex items-center gap-2">
                            <AddSwitchDialog />
                            <AddTileDialog />
                        </div>
                        {/* Mobile: dropdown */}
                        <div className="sm:hidden">
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <Button size="sm">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    }
                                />
                                <DropdownMenuContent align="end" className="w-auto">
                                    <DropdownMenuItem onClick={() => setAddTileOpen(true)}>
                                        <LayoutGrid className="mr-2 h-4 w-4" />
                                        {t("dashboard.addTile")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setAddSwitchOpen(true)}>
                                        <ToggleLeft className="mr-2 h-4 w-4" />
                                        {t("dashboard.addSwitch")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AddTileDialog open={addTileOpen} onOpenChange={setAddTileOpen} />
                            <AddSwitchDialog open={addSwitchOpen} onOpenChange={setAddSwitchOpen} />
                        </div>
                    </>
                }
            />

            {isEmpty ? (
                <EmptyState
                    icon={LayoutGrid}
                    title={t("dashboard.noTiles")}
                    description={t("dashboard.noTilesDescription")}
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
                                        onRemove={() =>
                                            deleteTile.mutate(
                                                { tileId: tile.id },
                                                { onSuccess: () => toast.success(t("toast.tileRemoved")) },
                                            )
                                        }
                                        onClick={() => setSelectedTile(tile)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Controls section */}
                    {switches.length > 0 && (
                        <section>
                            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
                                {t("nav.controls")}
                            </h2>
                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {switches.map((sw) => (
                                    <WidgetSwitch
                                        key={sw.id}
                                        switch_={sw}
                                        status={getWidgetStatus(
                                            sw.handler_id,
                                            sw.handler_running,
                                            sw.handler_connected,
                                        )}
                                        onEdit={() => setEditingSwitch(sw)}
                                        onRemove={() =>
                                            deleteSwitch.mutate(
                                                { switchId: sw.id },
                                                { onSuccess: () => toast.success(t("toast.switchRemoved")) },
                                            )
                                        }
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}

            {selectedTile && <TileChartDialog tile={selectedTile} onClose={() => setSelectedTile(null)} />}

            {editingTile && (
                <EditTileDialog
                    tile={editingTile}
                    open={!!editingTile}
                    onOpenChange={(open) => {
                        if (!open) setEditingTile(null);
                    }}
                />
            )}

            {editingSwitch && (
                <EditSwitchDialog
                    switch_={editingSwitch}
                    open={!!editingSwitch}
                    onOpenChange={(open) => {
                        if (!open) setEditingSwitch(null);
                    }}
                />
            )}
        </div>
    );
}

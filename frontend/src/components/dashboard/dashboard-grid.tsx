import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { DashboardTile } from "@/api/generated/contWatchAPI.schemas";
import {
    useDashboardApiWidgetsDashboardGet,
    useDeleteSwitchApiWidgetsSwitchesSwitchIdDelete,
    useDeleteTileApiWidgetsTilesTileIdDelete,
} from "@/api/generated/widgets/widgets";
import { AddSwitchDialog } from "@/components/dashboard/add-switch-dialog";
import { AddTileDialog } from "@/components/dashboard/add-tile-dialog";
import { TileChartDialog } from "@/components/dashboard/tile-chart-dialog";
import { WidgetSwitch } from "@/components/dashboard/widget-switch";
import { WidgetTile } from "@/components/dashboard/widget-tile";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardGrid() {
    const { t } = useTranslation();
    const { data } = useDashboardApiWidgetsDashboardGet();
    const deleteTile = useDeleteTileApiWidgetsTilesTileIdDelete();
    const deleteSwitch = useDeleteSwitchApiWidgetsSwitchesSwitchIdDelete();
    const [selectedTile, setSelectedTile] = useState<DashboardTile | null>(null);

    const tiles = data?.data?.tiles ?? [];
    const switches = data?.data?.switches ?? [];

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
                    <AddTileDialog />
                </div>

                {tiles.length === 0 ? (
                    <Card>
                        <CardContent className="py-8 text-center">
                            <p className="text-muted-foreground">{t("dashboard.noTiles")}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t("dashboard.noTilesDescription")}
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {tiles.map((tile) => (
                            <WidgetTile
                                key={tile.id}
                                tile={tile}
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
                )}
            </div>

            {switches.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">{t("dashboard.switches")}</h2>
                        <AddSwitchDialog />
                    </div>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {switches.map((sw) => (
                            <WidgetSwitch
                                key={sw.id}
                                switch_={sw}
                                onRemove={() =>
                                    deleteSwitch.mutate(
                                        { switchId: sw.id },
                                        { onSuccess: () => toast.success(t("toast.switchRemoved")) },
                                    )
                                }
                            />
                        ))}
                    </div>
                </div>
            )}

            {switches.length === 0 && tiles.length > 0 && (
                <div className="flex justify-end">
                    <AddSwitchDialog />
                </div>
            )}

            {selectedTile && <TileChartDialog tile={selectedTile} onClose={() => setSelectedTile(null)} />}
        </div>
    );
}

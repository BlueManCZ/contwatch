import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { DashboardTile } from "@/api/generated/contWatchAPI.schemas";
import {
    getListTilesApiWidgetsTilesGetQueryKey,
    useUpdateTileApiWidgetsTilesTileIdPatch,
} from "@/api/generated/widgets/widgets";
import { AttributeSelect } from "@/components/dashboard/attribute-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EditTileDialogProps {
    tile: DashboardTile;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRemove?: () => void;
}

export function EditTileDialog({ tile, open, onOpenChange, onRemove }: EditTileDialogProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedAttrId, setSelectedAttrId] = useState<string>(String(tile.attribute_id));
    const updateTile = useUpdateTileApiWidgetsTilesTileIdPatch();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedAttrId) return;
        updateTile.mutate(
            { tileId: tile.id, data: { attribute_id: Number(selectedAttrId) } },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({
                        queryKey: getListTilesApiWidgetsTilesGetQueryKey(),
                    });
                    onOpenChange(false);
                    toast.success(t("toast.tileUpdated"));
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("dashboard.editTile")}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <AttributeSelect value={selectedAttrId} onValueChange={setSelectedAttrId} showUnit />
                    </div>
                    <DialogFooter className="flex-row justify-between sm:justify-between">
                        {onRemove ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onRemove}
                                className="text-muted-foreground hover:text-destructive-foreground"
                            >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                {t("dashboard.removeTile")}
                            </Button>
                        ) : (
                            <div />
                        )}
                        <Button type="submit" disabled={!selectedAttrId || updateTile.isPending}>
                            {t("common.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

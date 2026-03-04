import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useListAttributesApiAttributesGet } from "@/api/generated/attributes/attributes";
import type { AttributeRead, DashboardTile } from "@/api/generated/contWatchAPI.schemas";
import {
    getListTilesApiWidgetsTilesGetQueryKey,
    useUpdateTileApiWidgetsTilesTileIdPatch,
} from "@/api/generated/widgets/widgets";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localizeAttributeLabel } from "@/lib/localize-attribute";

interface EditTileDialogProps {
    tile: DashboardTile;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRemove?: () => void;
}

export function EditTileDialog({ tile, open, onOpenChange, onRemove }: EditTileDialogProps) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedAttrId, setSelectedAttrId] = useState<string>(String(tile.attribute_id));

    const { data: attrsData } = useListAttributesApiAttributesGet(undefined);
    const updateTile = useUpdateTileApiWidgetsTilesTileIdPatch();

    const attributes = (attrsData?.data ?? []) as AttributeRead[];

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

    const selectedAttr = attributes.find((a) => String(a.id) === selectedAttrId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("dashboard.editTile")}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={selectedAttrId} onValueChange={(v) => setSelectedAttrId(v ?? "")}>
                            <SelectTrigger>
                                <SelectValue>
                                    {selectedAttr
                                        ? `${localizeAttributeLabel(selectedAttr.name, selectedAttr.label, t, i18n)}${selectedAttr.unit ? ` (${selectedAttr.unit})` : ""}`
                                        : t("dashboard.selectAttribute")}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                                {attributes.map((attr) => (
                                    <SelectItem key={attr.id} value={String(attr.id)}>
                                        {localizeAttributeLabel(attr.name, attr.label, t, i18n)}
                                        {attr.unit ? ` (${attr.unit})` : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="flex-row justify-between sm:justify-between">
                        {onRemove ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onRemove()}
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

import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useListAttributesApiAttributesGet } from "@/api/generated/attributes/attributes";
import type { AttributeRead } from "@/api/generated/contWatchAPI.schemas";
import { useCreateTileApiWidgetsTilesPost } from "@/api/generated/widgets/widgets";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddTileDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AddTileDialog({ open: controlledOpen, onOpenChange }: AddTileDialogProps = {}) {
    const { t } = useTranslation();
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;
    const [selectedAttrId, setSelectedAttrId] = useState<string>("");

    const { data: attrsData } = useListAttributesApiAttributesGet(undefined);
    const createTile = useCreateTileApiWidgetsTilesPost();

    const attributes = (attrsData?.data ?? []) as AttributeRead[];

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedAttrId) return;
        createTile.mutate(
            { data: { attribute_id: Number(selectedAttrId) } },
            {
                onSuccess: () => {
                    setOpen(false);
                    setSelectedAttrId("");
                    toast.success(t("toast.tileAdded"));
                },
            },
        );
    }

    const selectedAttr = attributes.find((a) => String(a.id) === selectedAttrId);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {controlledOpen === undefined && (
                <DialogTrigger
                    render={
                        <Button size="sm">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            {t("dashboard.addTile")}
                        </Button>
                    }
                />
            )}
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("dashboard.addTile")}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={selectedAttrId} onValueChange={(v) => setSelectedAttrId(v ?? "")}>
                            <SelectTrigger>
                                <SelectValue>
                                    {selectedAttr
                                        ? `${selectedAttr.label || selectedAttr.name}${selectedAttr.unit ? ` (${selectedAttr.unit})` : ""}`
                                        : t("dashboard.selectAttribute")}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {attributes.map((attr) => (
                                    <SelectItem key={attr.id} value={String(attr.id)}>
                                        {attr.label || attr.name}
                                        {attr.unit ? ` (${attr.unit})` : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={!selectedAttrId || createTile.isPending}>
                            {t("common.add")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

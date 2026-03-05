import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
    getListAttributesApiAttributesGetQueryKey,
    useDeleteAttributeApiAttributesAttributeIdDelete,
    useUpdateAttributeApiAttributesAttributeIdPatch,
} from "@/api/generated/attributes/attributes";
import type { AttributeRead, AttributeUpdate } from "@/api/generated/contWatchAPI.schemas";
import { getListHandlersApiHandlersGetQueryKey } from "@/api/generated/handlers/handlers";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { localizeAttributeLabel } from "@/lib/localize-attribute";

interface AttributeEditDialogProps {
    attribute: AttributeRead | null;
    onClose: () => void;
}

export function AttributeEditDialog({ attribute, onClose }: AttributeEditDialogProps) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [label, setLabel] = useState("");
    const [unit, setUnit] = useState("");
    const [icon, setIcon] = useState("");
    const [rounding, setRounding] = useState("");
    const [color, setColor] = useState("");
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const updateAttribute = useUpdateAttributeApiAttributesAttributeIdPatch();
    const deleteAttribute = useDeleteAttributeApiAttributesAttributeIdDelete();

    const open = attribute !== null;

    function handleOpenChange(next: boolean) {
        if (!next) onClose();
    }

    useEffect(() => {
        if (attribute) {
            setLabel(localizeAttributeLabel(attribute.name, attribute.label, t, i18n));
            setUnit(attribute.unit ?? "");
            setIcon(attribute.icon ?? "");
            setRounding(attribute.rounding != null ? String(attribute.rounding) : "");
            setColor(attribute.color ?? "");
        }
    }, [attribute, t, i18n]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!attribute) return;

        const data: AttributeUpdate = {};
        const newLabel = label || null;
        const newUnit = unit || null;
        const newIcon = icon || null;
        const newRounding = rounding !== "" ? Number.parseInt(rounding, 10) : null;
        const newColor = color || null;

        if (newLabel !== (attribute.label ?? null)) data.label = newLabel;
        if (newUnit !== (attribute.unit ?? null)) data.unit = newUnit;
        if (newIcon !== (attribute.icon ?? null)) data.icon = newIcon;
        if (newRounding !== (attribute.rounding ?? null)) data.rounding = newRounding;
        if (newColor !== (attribute.color ?? null)) data.color = newColor;

        updateAttribute.mutate(
            { attributeId: attribute.id, data },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: getListAttributesApiAttributesGetQueryKey() });
                    queryClient.invalidateQueries({ queryKey: getListHandlersApiHandlersGetQueryKey() });
                    onClose();
                    toast.success(t("toast.attributeUpdated"));
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("handlers.editAttribute")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("handlers.label")}</Label>
                            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("handlers.unit")}</Label>
                            <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("handlers.icon")}</Label>
                            <Input value={icon} onChange={(e) => setIcon(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("handlers.rounding")}</Label>
                            <Input
                                type="number"
                                value={rounding}
                                onChange={(e) => setRounding(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("handlers.color")}</Label>
                            <Input value={color} onChange={(e) => setColor(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter className="flex-row justify-between sm:justify-between">
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={deleteAttribute.isPending}
                            onClick={() => setConfirmDeleteOpen(true)}
                        >
                            {t("common.delete")}
                        </Button>
                        <Button type="submit" disabled={updateAttribute.isPending}>
                            {t("common.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
            <ConfirmDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                isPending={deleteAttribute.isPending}
                onConfirm={() => {
                    if (!attribute) return;
                    deleteAttribute.mutate(
                        { attributeId: attribute.id },
                        {
                            onSuccess: () => {
                                setConfirmDeleteOpen(false);
                                queryClient.invalidateQueries({
                                    queryKey: getListAttributesApiAttributesGetQueryKey(),
                                });
                                queryClient.invalidateQueries({
                                    queryKey: getListHandlersApiHandlersGetQueryKey(),
                                });
                                onClose();
                                toast.success(t("toast.attributeDeleted"));
                            },
                        },
                    );
                }}
                description={t("confirm.deleteAttribute")}
            />
        </Dialog>
    );
}

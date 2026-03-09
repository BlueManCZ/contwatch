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
import { OutOfRangeDialog } from "@/components/handlers/out-of-range-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
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
    const [minValue, setMinValue] = useState("");
    const [maxValue, setMaxValue] = useState("");
    const deleteConfirm = useConfirmDialog();
    const [outOfRangeOpen, setOutOfRangeOpen] = useState(false);
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
            setMinValue(attribute.min_value != null ? String(attribute.min_value) : "");
            setMaxValue(attribute.max_value != null ? String(attribute.max_value) : "");
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
        const newMinValue = minValue !== "" ? Number.parseFloat(minValue) : null;
        const newMaxValue = maxValue !== "" ? Number.parseFloat(maxValue) : null;

        if (newLabel !== (attribute.label ?? null)) data.label = newLabel;
        if (newUnit !== (attribute.unit ?? null)) data.unit = newUnit;
        if (newIcon !== (attribute.icon ?? null)) data.icon = newIcon;
        if (newRounding !== (attribute.rounding ?? null)) data.rounding = newRounding;
        if (newColor !== (attribute.color ?? null)) data.color = newColor;
        const boundsChanged =
            newMinValue !== (attribute.min_value ?? null) || newMaxValue !== (attribute.max_value ?? null);
        if (newMinValue !== (attribute.min_value ?? null)) data.min_value = newMinValue;
        if (newMaxValue !== (attribute.max_value ?? null)) data.max_value = newMaxValue;

        const hasBoundsAfterSave =
            (newMinValue ?? attribute.min_value) != null || (newMaxValue ?? attribute.max_value) != null;

        updateAttribute.mutate(
            { attributeId: attribute.id, data },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: getListAttributesApiAttributesGetQueryKey() });
                    queryClient.invalidateQueries({ queryKey: getListHandlersApiHandlersGetQueryKey() });
                    toast.success(t("toast.attributeUpdated"));
                    if (boundsChanged && hasBoundsAfterSave) {
                        setOutOfRangeOpen(true);
                    } else {
                        onClose();
                    }
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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("handlers.minValue")}</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={minValue}
                                    onChange={(e) => setMinValue(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("handlers.maxValue")}</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={maxValue}
                                    onChange={(e) => setMaxValue(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="flex-row justify-between">
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={deleteAttribute.isPending}
                            onClick={() => deleteConfirm.open()}
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
                {...deleteConfirm.dialogProps}
                variant="destructive"
                confirmLabel={t("common.delete")}
                isPending={deleteAttribute.isPending}
                onConfirm={() => {
                    if (!attribute) return;
                    deleteAttribute.mutate(
                        { attributeId: attribute.id },
                        {
                            onSuccess: () => {
                                deleteConfirm.close();
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
            {attribute && (
                <OutOfRangeDialog
                    attribute={attribute}
                    open={outOfRangeOpen}
                    onOpenChange={(next) => {
                        setOutOfRangeOpen(next);
                        if (!next) onClose();
                    }}
                />
            )}
        </Dialog>
    );
}

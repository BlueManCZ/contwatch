import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useListActionsApiActionsGet } from "@/api/generated/actions/actions";
import { useListAttributesApiAttributesGet } from "@/api/generated/attributes/attributes";
import type { ActionRead, AttributeRead, DashboardSwitch } from "@/api/generated/contWatchAPI.schemas";
import {
    getListSwitchesApiWidgetsSwitchesGetQueryKey,
    useUpdateSwitchApiWidgetsSwitchesSwitchIdPatch,
} from "@/api/generated/widgets/widgets";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localizeAttributeLabel } from "@/lib/localize-attribute";

interface EditSwitchDialogProps {
    switch_: DashboardSwitch;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRemove?: () => void;
}

export function EditSwitchDialog({ switch_, open, onOpenChange, onRemove }: EditSwitchDialogProps) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedAttrId, setSelectedAttrId] = useState<string>(String(switch_.attribute_id));
    const [attributeCompare, setAttributeCompare] = useState(switch_.attribute_compare ?? "");
    const [actionOnId, setActionOnId] = useState<string>(
        switch_.action_on_id ? String(switch_.action_on_id) : "",
    );
    const [actionOffId, setActionOffId] = useState<string>(
        switch_.action_off_id ? String(switch_.action_off_id) : "",
    );

    const { data: attrsData } = useListAttributesApiAttributesGet(undefined);
    const { data: actionsData } = useListActionsApiActionsGet();
    const updateSwitch = useUpdateSwitchApiWidgetsSwitchesSwitchIdPatch();

    const attributes = (attrsData?.data ?? []) as AttributeRead[];
    const actions = (actionsData?.data ?? []) as ActionRead[];

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedAttrId) return;
        updateSwitch.mutate(
            {
                switchId: switch_.id,
                data: {
                    attribute_id: Number(selectedAttrId),
                    attribute_compare: attributeCompare || undefined,
                    action_on_id: actionOnId ? Number(actionOnId) : undefined,
                    action_off_id: actionOffId ? Number(actionOffId) : undefined,
                },
            },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({
                        queryKey: getListSwitchesApiWidgetsSwitchesGetQueryKey(),
                    });
                    onOpenChange(false);
                    toast.success(t("toast.switchUpdated"));
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
                        <DialogTitle>{t("dashboard.editSwitch")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("dashboard.selectAttribute")}</Label>
                            <Select value={selectedAttrId} onValueChange={(v) => setSelectedAttrId(v ?? "")}>
                                <SelectTrigger>
                                    <SelectValue>
                                        {selectedAttr
                                            ? localizeAttributeLabel(
                                                  selectedAttr.name,
                                                  selectedAttr.label,
                                                  t,
                                                  i18n,
                                              )
                                            : t("dashboard.selectAttribute")}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                    {attributes.map((attr) => (
                                        <SelectItem key={attr.id} value={String(attr.id)}>
                                            {localizeAttributeLabel(attr.name, attr.label, t, i18n)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("dashboard.attributeCompare")}</Label>
                            <Input
                                value={attributeCompare}
                                onChange={(e) => setAttributeCompare(e.target.value)}
                                placeholder={t("dashboard.attributeCompareHint")}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>{t("dashboard.actionOn")}</Label>
                                <Select value={actionOnId} onValueChange={(v) => setActionOnId(v ?? "")}>
                                    <SelectTrigger>
                                        <SelectValue>
                                            {actionOnId
                                                ? t(
                                                      `knownActions.${actions.find((a) => String(a.id) === actionOnId)?.name?.replaceAll(" ", "_")}`,
                                                      actions.find((a) => String(a.id) === actionOnId)
                                                          ?.name ?? "",
                                                  )
                                                : t("dashboard.selectAction")}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent alignItemWithTrigger={false}>
                                        {actions.map((action) => (
                                            <SelectItem key={action.id} value={String(action.id)}>
                                                {t(
                                                    `knownActions.${action.name.replaceAll(" ", "_")}`,
                                                    action.name,
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t("dashboard.actionOff")}</Label>
                                <Select value={actionOffId} onValueChange={(v) => setActionOffId(v ?? "")}>
                                    <SelectTrigger>
                                        <SelectValue>
                                            {actionOffId
                                                ? t(
                                                      `knownActions.${actions.find((a) => String(a.id) === actionOffId)?.name?.replaceAll(" ", "_")}`,
                                                      actions.find((a) => String(a.id) === actionOffId)
                                                          ?.name ?? "",
                                                  )
                                                : t("dashboard.selectAction")}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent alignItemWithTrigger={false}>
                                        {actions.map((action) => (
                                            <SelectItem key={action.id} value={String(action.id)}>
                                                {t(
                                                    `knownActions.${action.name.replaceAll(" ", "_")}`,
                                                    action.name,
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
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
                                {t("dashboard.removeSwitch")}
                            </Button>
                        ) : (
                            <div />
                        )}
                        <Button type="submit" disabled={!selectedAttrId || updateSwitch.isPending}>
                            {t("common.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

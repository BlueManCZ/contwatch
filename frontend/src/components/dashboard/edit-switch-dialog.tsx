import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { DashboardSwitch } from "@/api/generated/contWatchAPI.schemas";
import {
    getListSwitchesApiWidgetsSwitchesGetQueryKey,
    useUpdateSwitchApiWidgetsSwitchesSwitchIdPatch,
} from "@/api/generated/widgets/widgets";
import { ActionSelect } from "@/components/dashboard/action-select";
import { AttributeSelect } from "@/components/dashboard/attribute-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditSwitchDialogProps {
    switch_: DashboardSwitch;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRemove?: () => void;
}

export function EditSwitchDialog({ switch_, open, onOpenChange, onRemove }: EditSwitchDialogProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedAttrId, setSelectedAttrId] = useState<string>(String(switch_.attribute_id));
    const [attributeCompare, setAttributeCompare] = useState(switch_.attribute_compare ?? "");
    const [actionOnId, setActionOnId] = useState<string>(
        switch_.action_on_id ? String(switch_.action_on_id) : "",
    );
    const [actionOffId, setActionOffId] = useState<string>(
        switch_.action_off_id ? String(switch_.action_off_id) : "",
    );
    const updateSwitch = useUpdateSwitchApiWidgetsSwitchesSwitchIdPatch();

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
                            <AttributeSelect value={selectedAttrId} onValueChange={setSelectedAttrId} />
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
                                <ActionSelect value={actionOnId} onValueChange={setActionOnId} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("dashboard.actionOff")}</Label>
                                <ActionSelect value={actionOffId} onValueChange={setActionOffId} />
                            </div>
                        </div>
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

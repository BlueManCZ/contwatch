import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useListActionsApiActionsGet } from "@/api/generated/actions/actions";
import { useListAttributesApiAttributesGet } from "@/api/generated/attributes/attributes";
import type { ActionRead, AttributeRead, DashboardSlider } from "@/api/generated/contWatchAPI.schemas";
import {
    getListSlidersApiWidgetsSlidersGetQueryKey,
    useUpdateSliderApiWidgetsSlidersSliderIdPatch,
} from "@/api/generated/widgets/widgets";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditSliderDialogProps {
    slider: DashboardSlider;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRemove?: () => void;
}

export function EditSliderDialog({ slider, open, onOpenChange, onRemove }: EditSliderDialogProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedAttrId, setSelectedAttrId] = useState(String(slider.attribute_id));
    const [selectedActionId, setSelectedActionId] = useState(String(slider.action_id));
    const [paramKey, setParamKey] = useState(slider.param_key);
    const [min, setMin] = useState(String(slider.min));
    const [max, setMax] = useState(String(slider.max));
    const [step, setStep] = useState(String(slider.step));

    const { data: attrsData } = useListAttributesApiAttributesGet(undefined);
    const { data: actionsData } = useListActionsApiActionsGet();
    const updateSlider = useUpdateSliderApiWidgetsSlidersSliderIdPatch();

    const attributes = (attrsData?.data ?? []) as AttributeRead[];
    const actions = (actionsData?.data ?? []) as ActionRead[];

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedAttrId || !selectedActionId || !paramKey) return;
        updateSlider.mutate(
            {
                sliderId: slider.id,
                data: {
                    attribute_id: Number(selectedAttrId),
                    action_id: Number(selectedActionId),
                    param_key: paramKey,
                    min: Number(min),
                    max: Number(max),
                    step: Number(step),
                },
            },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({
                        queryKey: getListSlidersApiWidgetsSlidersGetQueryKey(),
                    });
                    onOpenChange(false);
                    toast.success(t("toast.sliderUpdated"));
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
                        <DialogTitle>{t("dashboard.editSlider")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("dashboard.selectAttribute")}</Label>
                            <Select value={selectedAttrId} onValueChange={(v) => setSelectedAttrId(v ?? "")}>
                                <SelectTrigger>
                                    <SelectValue>
                                        {selectedAttr
                                            ? t(
                                                  `knownAttributes.${selectedAttr.name.replace(/[/:]/g, "_")}`,
                                                  selectedAttr.label || selectedAttr.name,
                                              )
                                            : t("dashboard.selectAttribute")}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                    {attributes.map((attr) => (
                                        <SelectItem key={attr.id} value={String(attr.id)}>
                                            {t(
                                                `knownAttributes.${attr.name.replace(/[/:]/g, "_")}`,
                                                attr.label || attr.name,
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("dashboard.selectAction")}</Label>
                            <Select
                                value={selectedActionId}
                                onValueChange={(v) => setSelectedActionId(v ?? "")}
                            >
                                <SelectTrigger>
                                    <SelectValue>
                                        {selectedActionId
                                            ? t(
                                                  `knownActions.${actions.find((a) => String(a.id) === selectedActionId)?.name?.replaceAll(" ", "_")}`,
                                                  actions.find((a) => String(a.id) === selectedActionId)
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
                            <Label>{t("dashboard.paramKey")}</Label>
                            <Input
                                value={paramKey}
                                onChange={(e) => setParamKey(e.target.value)}
                                placeholder="brightness"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-2">
                                <Label>{t("dashboard.sliderMin")}</Label>
                                <Input type="number" value={min} onChange={(e) => setMin(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("dashboard.sliderMax")}</Label>
                                <Input type="number" value={max} onChange={(e) => setMax(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("dashboard.sliderStep")}</Label>
                                <Input type="number" value={step} onChange={(e) => setStep(e.target.value)} />
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
                                {t("dashboard.removeSlider")}
                            </Button>
                        ) : (
                            <div />
                        )}
                        <Button
                            type="submit"
                            disabled={
                                !selectedAttrId || !selectedActionId || !paramKey || updateSlider.isPending
                            }
                        >
                            {t("common.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

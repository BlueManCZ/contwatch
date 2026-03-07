import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { DashboardWidget } from "@/api/generated/contWatchAPI.schemas";
import {
    getDashboardApiWidgetsDashboardGetQueryKey,
    useUpdateWidgetApiWidgetsWidgetIdPatch,
} from "@/api/generated/widgets/widgets";
import { ActionSelect } from "@/components/dashboard/action-select";
import { AttributeSelect } from "@/components/dashboard/attribute-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditWidgetDialogProps {
    widget: DashboardWidget;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRemove?: () => void;
}

export function EditWidgetDialog({ widget, open, onOpenChange, onRemove }: EditWidgetDialogProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const updateWidget = useUpdateWidgetApiWidgetsWidgetIdPatch();

    const [name, setName] = useState(widget.name ?? "");
    const [selectedAttrId, setSelectedAttrId] = useState<string>(
        widget.attribute_id ? String(widget.attribute_id) : "",
    );

    // Switch fields
    const [attributeCompare, setAttributeCompare] = useState(widget.attribute_compare ?? "");
    const [actionOnId, setActionOnId] = useState<string>(
        widget.action_on_id ? String(widget.action_on_id) : "",
    );
    const [actionOffId, setActionOffId] = useState<string>(
        widget.action_off_id ? String(widget.action_off_id) : "",
    );

    // Slider fields
    const [sliderActionId, setSliderActionId] = useState<string>(
        widget.action_id ? String(widget.action_id) : "",
    );
    const [paramKey, setParamKey] = useState(widget.param_key ?? "");
    const [min, setMin] = useState(String(widget.min ?? 0));
    const [max, setMax] = useState(String(widget.max ?? 100));
    const [step, setStep] = useState(String(widget.step ?? 1));

    // Button fields
    const [buttonActionId, setButtonActionId] = useState<string>(
        widget.action_id ? String(widget.action_id) : "",
    );
    const [icon, setIcon] = useState(widget.icon ?? "");

    const needsAttribute =
        widget.type === "tile" ||
        widget.type === "sparkline" ||
        widget.type === "switch" ||
        widget.type === "slider";

    function canSubmit() {
        if (needsAttribute && !selectedAttrId) return false;
        if (widget.type === "slider" && (!sliderActionId || !paramKey)) return false;
        if (widget.type === "button" && !buttonActionId) return false;
        return true;
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit()) return;

        const config: Record<string, unknown> = {};
        if (widget.type === "switch") {
            if (attributeCompare) config.attribute_compare = attributeCompare;
            if (actionOnId) config.action_on_id = Number(actionOnId);
            if (actionOffId) config.action_off_id = Number(actionOffId);
        } else if (widget.type === "slider") {
            config.action_id = Number(sliderActionId);
            config.param_key = paramKey;
            config.min = Number(min);
            config.max = Number(max);
            config.step = Number(step);
        } else if (widget.type === "button") {
            config.action_id = Number(buttonActionId);
            if (widget.handler_id) config.handler_id = widget.handler_id;
        }

        updateWidget.mutate(
            {
                widgetId: widget.id,
                data: {
                    name: name || null,
                    icon: icon || null,
                    attribute_id: selectedAttrId ? Number(selectedAttrId) : null,
                    config: Object.keys(config).length > 0 ? config : undefined,
                },
            },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({
                        queryKey: getDashboardApiWidgetsDashboardGetQueryKey(),
                    });
                    onOpenChange(false);
                    toast.success(t("toast.widgetUpdated"));
                },
            },
        );
    }

    const titleKey =
        {
            tile: "dashboard.editTile",
            sparkline: "dashboard.editSparkline",
            switch: "dashboard.editSwitch",
            slider: "dashboard.editSlider",
            button: "dashboard.editButton",
        }[widget.type] ?? "dashboard.editTile";

    const removeKey =
        {
            tile: "dashboard.removeTile",
            sparkline: "dashboard.removeSparkline",
            switch: "dashboard.removeSwitch",
            slider: "dashboard.removeSlider",
            button: "dashboard.removeButton",
        }[widget.type] ?? "dashboard.removeTile";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t(titleKey)}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("dashboard.widgetName")}</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t("dashboard.namePlaceholder")}
                            />
                        </div>

                        {needsAttribute && (
                            <div className="space-y-2">
                                <Label>{t("dashboard.selectAttribute")}</Label>
                                <AttributeSelect
                                    value={selectedAttrId}
                                    onValueChange={setSelectedAttrId}
                                    showUnit={widget.type === "tile"}
                                />
                            </div>
                        )}

                        {widget.type === "switch" && (
                            <>
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
                            </>
                        )}

                        {widget.type === "slider" && (
                            <>
                                <div className="space-y-2">
                                    <Label>{t("dashboard.selectAction")}</Label>
                                    <ActionSelect value={sliderActionId} onValueChange={setSliderActionId} />
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
                                        <Input
                                            type="number"
                                            value={min}
                                            onChange={(e) => setMin(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("dashboard.sliderMax")}</Label>
                                        <Input
                                            type="number"
                                            value={max}
                                            onChange={(e) => setMax(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("dashboard.sliderStep")}</Label>
                                        <Input
                                            type="number"
                                            value={step}
                                            onChange={(e) => setStep(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {widget.type === "button" && (
                            <>
                                <div className="space-y-2">
                                    <Label>{t("dashboard.selectAction")}</Label>
                                    <ActionSelect value={buttonActionId} onValueChange={setButtonActionId} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("dashboard.iconName")}</Label>
                                    <Input
                                        value={icon}
                                        onChange={(e) => setIcon(e.target.value)}
                                        placeholder="play"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter className="flex-row justify-between">
                        {onRemove ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onRemove}
                                className="text-muted-foreground hover:text-destructive-foreground cursor-pointer"
                            >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                {t(removeKey)}
                            </Button>
                        ) : (
                            <div />
                        )}
                        <Button type="submit" disabled={!canSubmit() || updateWidget.isPending}>
                            {t("common.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

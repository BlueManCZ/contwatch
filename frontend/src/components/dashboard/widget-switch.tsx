import { Pencil, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DashboardSwitch } from "@/api/generated/contWatchAPI.schemas";
import { useToggleSwitchApiWidgetsSwitchesSwitchIdTogglePost } from "@/api/generated/widgets/widgets";
import type { WidgetStatus } from "@/components/dashboard/widget-tile";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useLongPress } from "@/hooks/use-long-press";
import { useLiveValuesStore } from "@/stores/live-values";

interface WidgetSwitchProps {
    switch_: DashboardSwitch;
    status?: WidgetStatus;
    onRemove?: () => void;
    onEdit?: () => void;
}

export function WidgetSwitch({ switch_, status = "online", onRemove, onEdit }: WidgetSwitchProps) {
    const { t } = useTranslation();
    const liveVal = useLiveValuesStore((s) => s.values[switch_.attribute_id]);
    const toggle = useToggleSwitchApiWidgetsSwitchesSwitchIdTogglePost();
    const longPress = useLongPress({ onLongPress: () => onEdit?.(), disabled: !onEdit });

    const currentValue = liveVal?.value ?? switch_.value;

    const isOn = switch_.attribute_compare
        ? String(currentValue) === switch_.attribute_compare
        : Boolean(currentValue);

    const label = switch_.name || switch_.attribute_label || switch_.attribute_name;

    function handleToggle() {
        toggle.mutate({ switchId: switch_.id, data: { value: !isOn } });
    }

    return (
        <Card
            className={`relative overflow-hidden group py-0 transition-all duration-200 select-none${status === "offline" ? " opacity-40 grayscale cursor-default" : status === "warning" ? " opacity-70 cursor-default" : " cursor-pointer hover:shadow-lg hover:border-primary/30"}`}
            onClick={(e) => {
                longPress.onClick(e);
                if (!e.defaultPrevented && status === "online") handleToggle();
            }}
            onPointerDown={longPress.onPointerDown}
            onPointerMove={longPress.onPointerMove}
            onPointerUp={longPress.onPointerUp}
            onPointerCancel={longPress.onPointerCancel}
        >
            {status === "warning" && <div className="absolute inset-y-0 left-0 w-1 bg-warning" />}

            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-medium truncate">{label}</p>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                            {isOn ? t("dashboard.switchOn") : t("dashboard.switchOff")}
                        </p>
                    </div>
                    <Switch
                        checked={isOn}
                        onCheckedChange={handleToggle}
                        disabled={toggle.isPending || status !== "online"}
                        onClick={(e) => e.stopPropagation()}
                        className="scale-125"
                    />
                </div>

                {(onEdit || onRemove) && (
                    <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit();
                                }}
                                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                title={t("dashboard.editSwitch")}
                            >
                                <Pencil className="h-3 w-3" />
                            </button>
                        )}
                        {onRemove && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                }}
                                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive-foreground hover:bg-destructive/10 transition-all"
                                title={t("dashboard.removeSwitch")}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

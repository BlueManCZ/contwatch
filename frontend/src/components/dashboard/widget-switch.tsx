import { useTranslation } from "react-i18next";
import type { DashboardSwitch } from "@/api/generated/contWatchAPI.schemas";
import { useToggleSwitchApiWidgetsSwitchesSwitchIdTogglePost } from "@/api/generated/widgets/widgets";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useLiveValuesStore } from "@/stores/live-values";

interface WidgetSwitchProps {
    switch_: DashboardSwitch;
    onRemove?: () => void;
}

export function WidgetSwitch({ switch_, onRemove }: WidgetSwitchProps) {
    const { t } = useTranslation();
    const liveVal = useLiveValuesStore((s) => s.values[switch_.attribute_id]);
    const toggle = useToggleSwitchApiWidgetsSwitchesSwitchIdTogglePost();

    const currentValue = liveVal?.value ?? switch_.value;

    const isOn = switch_.attribute_compare
        ? String(currentValue) === switch_.attribute_compare
        : Boolean(currentValue);

    const label = switch_.name || switch_.attribute_label || switch_.attribute_name;

    function handleToggle() {
        toggle.mutate({ switchId: switch_.id, data: { value: !isOn } });
    }

    return (
        <Card className="relative group">
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                        <p className="text-sm font-medium truncate">{label}</p>
                        <p className="text-xs text-muted-foreground">
                            {isOn ? t("dashboard.switchOn") : t("dashboard.switchOff")}
                        </p>
                    </div>
                    <Switch checked={isOn} onCheckedChange={handleToggle} disabled={toggle.isPending} />
                </div>
                {onRemove && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-destructive transition-opacity"
                        title={t("dashboard.removeSwitch")}
                    >
                        &times;
                    </button>
                )}
            </CardContent>
        </Card>
    );
}

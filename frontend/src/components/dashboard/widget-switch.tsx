import { History, Pencil, X } from "lucide-react";
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
    const { t, i18n } = useTranslation();
    const liveVal = useLiveValuesStore((s) => s.values[switch_.attribute_id]);
    const toggle = useToggleSwitchApiWidgetsSwitchesSwitchIdTogglePost();
    const longPress = useLongPress({ onLongPress: () => onEdit?.(), disabled: !onEdit });

    const currentValue = liveVal?.value ?? switch_.value;

    const isOn = switch_.attribute_compare
        ? String(currentValue) === switch_.attribute_compare
        : Boolean(currentValue);

    const lastChanged = liveVal?.last_changed;

    const i18nKey = `knownAttributes.${switch_.attribute_name.replace(/[/:]/g, "_")}`;
    const englishDefault = i18n.exists(i18nKey) ? String(i18n.t(i18nKey, { lng: "en" })) : null;
    const label = switch_.attribute_label
        ? switch_.attribute_label === englishDefault
            ? String(t(i18nKey))
            : switch_.attribute_label
        : String(t(i18nKey, switch_.attribute_name));

    function handleToggle() {
        toggle.mutate({ switchId: switch_.id, data: { value: !isOn } });
    }

    return (
        <Card
            className={`relative overflow-hidden group py-0 h-full transition-all duration-300 select-none${status === "offline" ? " opacity-40 grayscale cursor-default" : status === "warning" ? " opacity-70 cursor-default" : " cursor-pointer hover:shadow-lg hover:border-primary/30"}`}
            onClick={(e) => {
                longPress.onClick(e);
                if (!e.defaultPrevented && status === "online") handleToggle();
            }}
            onPointerDown={longPress.onPointerDown}
            onPointerMove={longPress.onPointerMove}
            onPointerUp={longPress.onPointerUp}
            onPointerCancel={longPress.onPointerCancel}
        >
            {/* Left accent strip — dynamic based on state */}
            {status === "warning" ? (
                <div className="absolute inset-y-0 left-0 w-1 bg-warning" />
            ) : (
                <div
                    className={`absolute inset-y-0 left-0 w-1 transition-colors duration-300 ${isOn ? "bg-primary/70" : "bg-muted-foreground/20"}`}
                />
            )}

            {/* Ambient glow when ON — emanates from the switch area */}
            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                style={{
                    background: "radial-gradient(ellipse at 85% 50%, var(--primary) 0%, transparent 60%)",
                    opacity: isOn && status === "online" ? 0.05 : 0,
                }}
            />

            <CardContent className="p-4 pl-5 h-full flex gap-4">
                {/* Text — stretched full height: label top, status middle, timestamp bottom */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest truncate">
                        {label}
                    </p>
                    <div className="flex-1 flex items-center">
                        <div className="flex items-center gap-2">
                            <div
                                className={`h-2.5 w-2.5 rounded-full shrink-0 transition-all duration-300 ${isOn ? "bg-success shadow-[0_0_6px_theme(--color-success)]" : "bg-muted-foreground/30"}`}
                            />
                            <span
                                className={`text-xl font-semibold leading-none transition-colors duration-300 ${isOn ? "" : "text-muted-foreground"}`}
                            >
                                {isOn ? t("dashboard.switchOn") : t("dashboard.switchOff")}
                            </span>
                        </div>
                    </div>
                    {lastChanged && (
                        <span className="text-[11px] text-muted-foreground data-value flex items-center gap-1">
                            <History
                                className={`h-3 w-3 ${isOn ? "text-info" : "text-destructive-foreground"}`}
                            />
                            {new Date(lastChanged).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    )}
                </div>
                {/* Switch — vertically centered in card */}
                <div className="flex items-center [&_[data-slot=switch][data-checked]]:shadow-[0_0_10px_var(--glow-amber)]">
                    <Switch
                        checked={isOn}
                        disabled={toggle.isPending || status !== "online"}
                        onClick={(e) => e.stopPropagation()}
                        className="scale-125 pointer-events-none"
                    />
                </div>
            </CardContent>

            {(onEdit || onRemove) && (
                <div className="absolute top-2 right-2 hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
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
        </Card>
    );
}

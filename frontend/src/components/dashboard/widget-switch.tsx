import { History, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { DashboardWidget } from "@/api/generated/contWatchAPI.schemas";
import { useToggleSwitchApiWidgetsWidgetIdTogglePost } from "@/api/generated/widgets/widgets";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { localizeAttributeLabel } from "@/lib/localize-attribute";
import { boldName } from "@/lib/utils";
import type { WidgetStatus } from "@/lib/widget-status";
import { useHandlerDataValuesStore } from "@/stores/handler-data-values";
import { useLiveValuesStore } from "@/stores/live-values";

interface WidgetSwitchProps {
    widget: DashboardWidget;
    status?: WidgetStatus;
    onRemove?: () => void;
    onEdit?: () => void;
}

export function WidgetSwitch({ widget: switch_, status = "online", onRemove, onEdit }: WidgetSwitchProps) {
    const { t, i18n } = useTranslation();
    const liveVal = useLiveValuesStore((s) =>
        switch_.attribute_id ? s.values[switch_.attribute_id] : undefined,
    );
    const rawVal = useHandlerDataValuesStore((s) =>
        !switch_.attribute_id && switch_.handler_id && switch_.attribute_name
            ? s.values[`${switch_.handler_id}:${switch_.attribute_name}`]
            : undefined,
    );
    const toggle = useToggleSwitchApiWidgetsWidgetIdTogglePost({
        mutation: { meta: { skipGlobalErrorToast: true } },
    });
    const [confirmOpen, setConfirmOpen] = useState(false);

    const currentValue = liveVal?.value ?? rawVal?.value ?? switch_.value;

    const isOn = switch_.attribute_compare
        ? String(currentValue) === switch_.attribute_compare
        : Boolean(currentValue);

    const lastChanged = liveVal?.last_changed ?? rawVal?.last_changed ?? switch_.last_changed;

    const label =
        switch_.name ||
        localizeAttributeLabel(switch_.attribute_name ?? "", switch_.attribute_label, t, i18n);

    function doToggle() {
        const actionName = !isOn ? switch_.action_on_name : switch_.action_off_name;
        const name = actionName
            ? t(`knownActions.${actionName.replaceAll(" ", "_")}`, actionName)
            : undefined;
        toggle.mutate(
            { widgetId: switch_.id, data: { value: !isOn } },
            {
                onSettled: () => setConfirmOpen(false),
                onSuccess: () => name && toast.success(boldName(t, "toast.actionExecuted", name)),
                onError: () => toast.error(boldName(t, "toast.actionFailed", name ?? "")),
            },
        );
    }

    function handleToggle() {
        if (switch_.confirm_actions) {
            setConfirmOpen(true);
        } else {
            doToggle();
        }
    }

    return (
        <Card
            className={`relative overflow-hidden group py-0 h-full transition-all duration-300 select-none${status === "offline" ? " opacity-40 grayscale cursor-default" : status === "warning" ? " opacity-70 cursor-default" : " cursor-pointer hover:shadow-lg hover:border-primary/30"}`}
            onClick={() => status === "online" && handleToggle()}
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

            <CardContent className="p-3 pl-4 sm:p-4 sm:pl-5 h-full flex gap-3 sm:gap-4">
                {/* Text — stretched full height: label top, status middle, timestamp bottom */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider sm:tracking-widest line-clamp-2">
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
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                onConfirm={doToggle}
                description={t("confirm.executeAction", {
                    action: (() => {
                        const name = isOn ? switch_.action_off_name : switch_.action_on_name;
                        return name ? t(`knownActions.${name.replaceAll(" ", "_")}`, name) : "";
                    })(),
                    device: switch_.handler_label ?? switch_.attribute_name,
                })}
            />
        </Card>
    );
}

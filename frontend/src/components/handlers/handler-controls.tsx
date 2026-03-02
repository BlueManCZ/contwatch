import { DynamicIcon } from "lucide-react/dynamic";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useExecuteActionApiActionsActionIdExecutePost } from "@/api/generated/actions/actions";
import type { HandlerRead, ResolvedControl } from "@/api/generated/contWatchAPI.schemas";
import { useHandlerControlsApiHandlersHandlerIdControlsGet } from "@/api/generated/handlers/handlers";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useLiveValuesStore } from "@/stores/live-values";

interface HandlerControlsProps {
    handler: HandlerRead;
}

export function HandlerControls({ handler }: HandlerControlsProps) {
    const { t } = useTranslation();
    const { data: controlsData } = useHandlerControlsApiHandlersHandlerIdControlsGet(handler.id, {
        query: { refetchInterval: 5000 },
    });
    const controls = (controlsData?.data ?? []) as ResolvedControl[];

    if (controls.length === 0) return null;

    return (
        <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
                {t("handlers.controls")}
            </h4>
            <div className="space-y-2">
                {controls.map((control) =>
                    control.type === "switch" ? (
                        <ControlSwitch key={control.key} control={control} />
                    ) : (
                        <ControlSlider key={control.key} control={control} />
                    ),
                )}
            </div>
        </div>
    );
}

function ControlSwitch({ control }: { control: ResolvedControl }) {
    const { t } = useTranslation();
    const executeAction = useExecuteActionApiActionsActionIdExecutePost();
    const liveValue = useLiveValuesStore((s) =>
        control.attribute_id ? s.values[control.attribute_id] : undefined,
    );

    const currentValue = liveValue?.value ?? control.value;
    const isOn = control.state_compare
        ? String(currentValue) === control.state_compare
        : Boolean(currentValue);

    function localizeAction(name: string | null | undefined) {
        if (!name) return name;
        return t(`knownActions.${name.replaceAll(" ", "_")}`, name);
    }

    function handleToggle(checked: boolean) {
        const actionId = checked ? control.action_on_id : control.action_off_id;
        if (!actionId) return;
        const actionName = localizeAction(checked ? control.action_on_name : control.action_off_name);
        executeAction.mutate(
            { actionId, data: null },
            {
                onSuccess: () => toast.success(t("toast.actionExecuted", { name: actionName })),
                onError: () => toast.error(t("toast.actionFailed", { name: actionName })),
            },
        );
    }

    return (
        <button
            type="button"
            className={cn(
                "relative flex w-full items-center gap-3 rounded-lg border border-l-2 px-3 py-2.5 overflow-hidden transition-all duration-300 text-left",
                isOn ? "border-l-primary/60" : "border-l-muted-foreground/15",
                !control.resolved && "opacity-50",
                control.resolved && "cursor-pointer hover:bg-accent/50",
            )}
            onClick={() => control.resolved && handleToggle(!isOn)}
            disabled={!control.resolved || executeAction.isPending}
        >
            {/* Ambient glow when ON */}
            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                style={{
                    background: "radial-gradient(ellipse at 80% 50%, var(--primary) 0%, transparent 60%)",
                    opacity: isOn ? 0.04 : 0,
                }}
            />

            {control.icon && (
                <DynamicIcon
                    // biome-ignore lint/suspicious/noExplicitAny: icon name is dynamic from backend
                    name={control.icon as any}
                    className={cn(
                        "h-4 w-4 shrink-0 transition-colors duration-300",
                        isOn ? "text-primary" : "text-muted-foreground",
                    )}
                />
            )}
            <span className="text-sm font-medium flex-1 min-w-0 truncate">
                {t(`controls.${control.key}`, control.label)}
            </span>
            {control.resolved ? (
                <span className="flex items-center [&_[data-slot=switch][data-checked]]:shadow-[0_0_8px_var(--glow-amber)]">
                    <Switch
                        checked={isOn}
                        onCheckedChange={handleToggle}
                        disabled={executeAction.isPending}
                        onClick={(e) => e.stopPropagation()}
                    />
                </span>
            ) : (
                <span className="text-xs text-muted-foreground">{t("handlers.controlUnresolved")}</span>
            )}
        </button>
    );
}

function ControlSlider({ control }: { control: ResolvedControl }) {
    const { t } = useTranslation();
    const executeAction = useExecuteActionApiActionsActionIdExecutePost();
    const liveValue = useLiveValuesStore((s) =>
        control.attribute_id ? s.values[control.attribute_id] : undefined,
    );

    const currentValue = liveValue?.value ?? control.value;
    const numericValue = currentValue != null ? Number(currentValue) : (control.min ?? 0);
    const [localValue, setLocalValue] = useState<number | null>(null);
    const committedRef = useRef<number | null>(null);
    const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clear local override once the live value catches up to the committed value
    useEffect(() => {
        if (committedRef.current != null && numericValue === committedRef.current) {
            committedRef.current = null;
            setLocalValue(null);
        }
    }, [numericValue]);

    const displayValue = localValue ?? numericValue;
    const minVal = control.min ?? 0;
    const maxVal = control.max ?? 100;
    const range = maxVal - minVal;
    const fillPercent = range > 0 ? ((displayValue - minVal) / range) * 100 : 0;

    function handleValueChange(value: number | readonly number[]) {
        const val = Array.isArray(value) ? value[0] : value;
        setLocalValue(val);
        if (commitTimerRef.current) clearTimeout(commitTimerRef.current);
        commitTimerRef.current = setTimeout(() => {
            commitValue(val);
        }, 500);
    }

    function commitValue(val: number) {
        if (!control.action_id || !control.param_key) return;
        committedRef.current = val;
        executeAction.mutate(
            { actionId: control.action_id, data: { params: { [control.param_key]: val } } },
            {
                onSuccess: () => {
                    const name = control.action_name
                        ? t(`knownActions.${control.action_name.replaceAll(" ", "_")}`, control.action_name)
                        : control.action_name;
                    toast.success(t("toast.actionExecuted", { name }));
                },
                onError: () => {
                    const name = control.action_name
                        ? t(`knownActions.${control.action_name.replaceAll(" ", "_")}`, control.action_name)
                        : control.action_name;
                    toast.error(t("toast.actionFailed", { name }));
                    committedRef.current = null;
                    setLocalValue(null);
                },
            },
        );
    }

    return (
        <div
            className={cn(
                "relative rounded-lg border border-l-2 border-l-primary/60 overflow-hidden px-3 py-2.5 space-y-2.5 transition-all duration-300",
                !control.resolved && "opacity-50",
            )}
        >
            {/* Ambient glow following fill position */}
            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                style={{
                    background: `radial-gradient(ellipse at ${Math.max(15, fillPercent)}% 70%, var(--primary) 0%, transparent 55%)`,
                    opacity: 0.03,
                }}
            />

            <div className="flex items-center gap-3">
                {control.icon && (
                    <DynamicIcon
                        // biome-ignore lint/suspicious/noExplicitAny: icon name is dynamic from backend
                        name={control.icon as any}
                        className="h-4 w-4 text-primary/70 shrink-0"
                    />
                )}
                <span className="text-sm font-medium flex-1 min-w-0 truncate">
                    {t(`controls.${control.key}`, control.label)}
                </span>
                <span className="text-lg font-semibold data-value leading-none">
                    {Math.round(displayValue)}
                    {control.unit && (
                        <span className="text-xs text-muted-foreground ml-1 font-medium">{control.unit}</span>
                    )}
                </span>
            </div>
            {control.resolved ? (
                <div className="relative py-0.5">
                    {/* Soft bloom behind the filled portion */}
                    <div
                        className="absolute top-1/2 left-0 -translate-y-1/2 h-5 rounded-full blur-md pointer-events-none transition-all duration-150"
                        style={{
                            width: `${fillPercent}%`,
                            background: "var(--primary)",
                            opacity: 0.15,
                        }}
                    />
                    <div className="relative [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:shadow-md">
                        <Slider
                            value={[displayValue]}
                            onValueChange={handleValueChange}
                            min={control.min}
                            max={control.max}
                            step={control.step}
                            disabled={executeAction.isPending}
                        />
                    </div>
                </div>
            ) : (
                <span className="text-xs text-muted-foreground">{t("handlers.controlUnresolved")}</span>
            )}
        </div>
    );
}

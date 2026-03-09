import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { DashboardWidget } from "@/api/generated/contWatchAPI.schemas";
import { useSetSliderApiWidgetsWidgetIdSetPost } from "@/api/generated/widgets/widgets";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { WidgetOverlayActions } from "@/components/dashboard/widget-overlay-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { formatValue } from "@/lib/format-value";
import { localizeAttributeLabel } from "@/lib/localize-attribute";
import { boldName } from "@/lib/utils";
import type { WidgetStatus } from "@/lib/widget-status";
import { useHandlerDataValuesStore } from "@/stores/handler-data-values";
import { useLiveValuesStore } from "@/stores/live-values";

interface WidgetSliderProps {
    widget: DashboardWidget;
    status?: WidgetStatus;
    onRemove?: () => void;
    onEdit?: () => void;
}

export function WidgetSlider({ widget: slider, status = "online", onRemove, onEdit }: WidgetSliderProps) {
    const { t, i18n } = useTranslation();
    const liveVal = useLiveValuesStore((s) =>
        slider.attribute_id ? s.values[slider.attribute_id] : undefined,
    );
    const rawVal = useHandlerDataValuesStore((s) =>
        !slider.attribute_id && slider.handler_id && slider.attribute_name
            ? s.values[`${slider.handler_id}:${slider.attribute_name}`]
            : undefined,
    );
    const setSlider = useSetSliderApiWidgetsWidgetIdSetPost({
        mutation: { meta: { skipGlobalErrorToast: true } },
    });

    const isDragging = useRef(false);
    const [localValue, setLocalValue] = useState<number | null>(null);
    const [active, setActive] = useState(false);
    const [pendingCommitVal, setPendingCommitVal] = useState<number | null>(null);

    const liveNumber =
        liveVal?.value != null ? Number(liveVal.value) : rawVal?.value != null ? Number(rawVal.value) : null;
    const displayValue = localValue ?? liveNumber ?? slider.min ?? 0;

    // Sync live value when not dragging
    useEffect(() => {
        if (!isDragging.current && liveNumber != null) {
            setLocalValue(null);
        }
    }, [liveNumber]);

    const doCommit = useCallback(
        (v: number) => {
            const name = slider.action_name
                ? t(`knownActions.${slider.action_name.replaceAll(" ", "_")}`, slider.action_name)
                : undefined;
            setSlider.mutate(
                { widgetId: slider.id, data: { value: v } },
                {
                    onSettled: () => setPendingCommitVal(null),
                    onSuccess: () => name && toast.success(boldName(t, "toast.actionExecuted", name)),
                    onError: () => toast.error(boldName(t, "toast.actionFailed", name ?? "")),
                },
            );
        },
        [setSlider, slider.id, slider.action_name, t],
    );

    const handleValueChange = useCallback((value: number | readonly number[]) => {
        isDragging.current = true;
        setActive(true);
        const v = Array.isArray(value) ? value[0] : value;
        setLocalValue(v);
    }, []);

    const handleValueCommit = useCallback(
        (value: number | readonly number[]) => {
            isDragging.current = false;
            setActive(false);
            const v = Array.isArray(value) ? value[0] : value;
            setLocalValue(v);
            if (slider.confirm_actions) {
                setPendingCommitVal(v);
            } else {
                doCommit(v);
            }
        },
        [slider.confirm_actions, doCommit],
    );

    const label =
        slider.name || localizeAttributeLabel(slider.attribute_name ?? "", slider.attribute_label, t, i18n);
    const sliderMin = slider.min ?? 0;
    const sliderMax = slider.max ?? 100;
    const sliderStep = slider.step ?? 1;
    const range = sliderMax - sliderMin;
    const fillPercent = range > 0 ? ((displayValue - sliderMin) / range) * 100 : 0;

    const rawFormatted =
        sliderStep >= 1
            ? Math.round(displayValue)
            : Number(displayValue.toFixed(String(sliderStep).split(".")[1]?.length ?? 1));
    const scaled = slider.unit ? formatValue(rawFormatted, slider.unit) : null;
    const formattedValue = scaled?.value ?? String(rawFormatted);
    const formattedUnit = scaled?.unit ?? slider.unit;

    return (
        <Card
            className={`relative overflow-hidden group py-0 h-full transition-all duration-300 select-none${
                status === "offline" ? " opacity-40 grayscale" : status === "warning" ? " opacity-70" : ""
            }${active ? " shadow-lg" : ""}`}
        >
            {/* Left accent strip */}
            {status === "warning" ? (
                <div className="absolute inset-y-0 left-0 w-1 bg-warning" />
            ) : (
                <div className="absolute inset-y-0 left-0 w-1 bg-primary/70" />
            )}

            {/* Ambient fill glow — radial gradient follows the slider position */}
            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                style={{
                    background: `radial-gradient(ellipse at ${Math.max(15, fillPercent)}% 65%, var(--primary) 0%, transparent 55%)`,
                    opacity: status === "online" ? (active ? 0.07 : 0.03) : 0,
                }}
            />

            <CardContent className="p-3 pl-4 sm:p-4 sm:pl-5 h-full flex flex-col gap-2">
                {/* Header: label + value on same row */}
                <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider sm:tracking-widest line-clamp-2">
                        {label}
                    </p>
                    <div className="flex items-baseline gap-1.5 shrink-0">
                        <span className="text-xl sm:text-2xl font-semibold data-value leading-none">
                            {formattedValue}
                        </span>
                        {formattedUnit && (
                            <span className="text-sm text-muted-foreground font-medium">{formattedUnit}</span>
                        )}
                    </div>
                </div>

                {/* Slider area — centered in remaining space */}
                <div className="flex-1 flex flex-col justify-center gap-1">
                    {/* Enhanced slider with track glow */}
                    <div className="relative py-1">
                        {/* Soft bloom behind the filled portion */}
                        <div
                            className="absolute top-1/2 left-0 -translate-y-1/2 h-6 rounded-full blur-md pointer-events-none transition-all duration-150"
                            style={{
                                width: `${fillPercent}%`,
                                background: "var(--primary)",
                                opacity: status === "online" ? (active ? 0.25 : 0.15) : 0,
                            }}
                        />
                        <div className="relative [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:shadow-md">
                            <Slider
                                value={[displayValue]}
                                onValueChange={handleValueChange}
                                onValueCommitted={handleValueCommit}
                                min={sliderMin}
                                max={sliderMax}
                                step={sliderStep}
                                disabled={status !== "online" || setSlider.isPending}
                            />
                        </div>
                    </div>

                    {/* Range labels */}
                    <div className="flex justify-between text-[10px] text-muted-foreground/60 tabular-nums">
                        <span>
                            {sliderMin}
                            {slider.unit && ` ${slider.unit}`}
                        </span>
                        <span>
                            {sliderMax}
                            {slider.unit && ` ${slider.unit}`}
                        </span>
                    </div>
                </div>
            </CardContent>

            <WidgetOverlayActions onEdit={onEdit} onRemove={onRemove} />
            <ConfirmDialog
                open={pendingCommitVal !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setLocalValue(null);
                        setPendingCommitVal(null);
                    }
                }}
                onConfirm={() => {
                    if (pendingCommitVal !== null) doCommit(pendingCommitVal);
                }}
                description={t("confirm.executeAction", {
                    action: slider.action_name
                        ? t(`knownActions.${slider.action_name.replaceAll(" ", "_")}`, slider.action_name)
                        : "",
                    device: slider.handler_label ?? slider.attribute_name,
                })}
            />
        </Card>
    );
}

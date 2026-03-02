import { Pencil, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DashboardSlider } from "@/api/generated/contWatchAPI.schemas";
import { useSetSliderApiWidgetsSlidersSliderIdSetPost } from "@/api/generated/widgets/widgets";
import type { WidgetStatus } from "@/components/dashboard/widget-tile";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useLongPress } from "@/hooks/use-long-press";
import { formatValue } from "@/lib/format-value";
import { useLiveValuesStore } from "@/stores/live-values";

interface WidgetSliderProps {
    slider: DashboardSlider;
    status?: WidgetStatus;
    onRemove?: () => void;
    onEdit?: () => void;
}

export function WidgetSlider({ slider, status = "online", onRemove, onEdit }: WidgetSliderProps) {
    const { t, i18n } = useTranslation();
    const liveVal = useLiveValuesStore((s) => s.values[slider.attribute_id]);
    const setSlider = useSetSliderApiWidgetsSlidersSliderIdSetPost();
    const longPress = useLongPress({ onLongPress: () => onEdit?.(), disabled: !onEdit });

    const isDragging = useRef(false);
    const [localValue, setLocalValue] = useState<number | null>(null);
    const [active, setActive] = useState(false);

    const liveNumber = liveVal?.value != null ? Number(liveVal.value) : null;
    const displayValue = localValue ?? liveNumber ?? slider.min;

    // Sync live value when not dragging
    useEffect(() => {
        if (!isDragging.current && liveNumber != null) {
            setLocalValue(null);
        }
    }, [liveNumber]);

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
            setSlider.mutate({ sliderId: slider.id, data: { value: v } });
        },
        [setSlider, slider.id],
    );

    const i18nKey = `knownAttributes.${slider.attribute_name.replace(/[/:]/g, "_")}`;
    const englishDefault = i18n.exists(i18nKey) ? String(i18n.t(i18nKey, { lng: "en" })) : null;
    const label = slider.attribute_label
        ? slider.attribute_label === englishDefault
            ? String(t(i18nKey))
            : slider.attribute_label
        : String(t(i18nKey, slider.attribute_name));
    const range = slider.max - slider.min;
    const fillPercent = range > 0 ? ((displayValue - slider.min) / range) * 100 : 0;

    const rawFormatted =
        slider.step >= 1
            ? Math.round(displayValue)
            : Number(displayValue.toFixed(String(slider.step).split(".")[1]?.length ?? 1));
    const scaled = slider.unit ? formatValue(rawFormatted, slider.unit) : null;
    const formattedValue = scaled?.value ?? String(rawFormatted);
    const formattedUnit = scaled?.unit ?? slider.unit;

    return (
        <Card
            className={`relative overflow-hidden group py-0 h-full transition-all duration-300 select-none${
                status === "offline" ? " opacity-40 grayscale" : status === "warning" ? " opacity-70" : ""
            }${active ? " shadow-lg" : ""}`}
            onPointerDown={longPress.onPointerDown}
            onPointerMove={longPress.onPointerMove}
            onPointerUp={longPress.onPointerUp}
            onPointerCancel={longPress.onPointerCancel}
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

            <CardContent className="p-4 pl-5 h-full flex flex-col gap-2">
                {/* Header: label + value on same row */}
                <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest truncate">
                        {label}
                    </p>
                    <div className="flex items-baseline gap-1.5 shrink-0">
                        <span className="text-2xl font-semibold data-value leading-none">
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
                                min={slider.min}
                                max={slider.max}
                                step={slider.step}
                                disabled={status !== "online" || setSlider.isPending}
                            />
                        </div>
                    </div>

                    {/* Range labels */}
                    <div className="flex justify-between text-[10px] text-muted-foreground/60 tabular-nums">
                        <span>
                            {slider.min}
                            {slider.unit && ` ${slider.unit}`}
                        </span>
                        <span>
                            {slider.max}
                            {slider.unit && ` ${slider.unit}`}
                        </span>
                    </div>
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
                            title={t("dashboard.editSlider")}
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
                            title={t("dashboard.removeSlider")}
                        >
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            )}
        </Card>
    );
}

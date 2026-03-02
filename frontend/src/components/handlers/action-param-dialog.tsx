import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useExecuteActionApiActionsActionIdExecutePost } from "@/api/generated/actions/actions";
import type {
    ActionParamInfo,
    ActionRead,
    AttributeRead,
    HandlerRead,
    HandlerTypeInfo,
    KnownControlInfo,
} from "@/api/generated/contWatchAPI.schemas";
import { useListHandlerTypesApiHandlersTypesGet } from "@/api/generated/handlers/handlers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useLiveValuesStore } from "@/stores/live-values";

interface ActionParamPopoverProps {
    action: ActionRead;
    params: ActionParamInfo[];
    handler: HandlerRead;
    children: React.ReactNode;
}

export function ActionParamPopover({ action, params, handler, children }: ActionParamPopoverProps) {
    const { t } = useTranslation();
    const executeAction = useExecuteActionApiActionsActionIdExecutePost();
    const [open, setOpen] = useState(false);
    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();
    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];

    // Map param_key -> attribute_id via known controls
    const paramAttrIds = useMemo(() => {
        const map: Record<string, number | undefined> = {};
        const ht = handlerTypes.find((h) => h.type === handler.type);
        if (!ht) return map;
        const controls = (ht.known_controls ?? []) as KnownControlInfo[];
        const attributes = (handler.attributes ?? []) as AttributeRead[];
        for (const control of controls) {
            if (control.action === action.name && control.param_key && control.state_attribute) {
                const attr = attributes.find((a) => a.name === control.state_attribute);
                if (attr) {
                    map[control.param_key] = attr.id;
                }
            }
        }
        return map;
    }, [handlerTypes, handler.type, handler.attributes, action.name]);

    const [values, setValues] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        for (const p of params) {
            initial[p.key] = p.default ?? p.min ?? 0;
        }
        return initial;
    });

    // Reset slider values from live attribute values when popover opens
    useEffect(() => {
        if (open) {
            const liveState = useLiveValuesStore.getState().values;
            setValues(() => {
                const initial: Record<string, number> = {};
                for (const p of params) {
                    const attrId = paramAttrIds[p.key];
                    const lv = attrId != null ? liveState[attrId] : undefined;
                    initial[p.key] = lv?.value != null ? Number(lv.value) : (p.default ?? p.min ?? 0);
                }
                return initial;
            });
        }
    }, [open, paramAttrIds, params]);

    const localizedName = t(`knownActions.${action.name.replaceAll(" ", "_")}`, action.name);

    function handleSubmit() {
        executeAction.mutate(
            { actionId: action.id, data: { params: values } },
            {
                onSuccess: () => {
                    toast.success(t("toast.actionExecuted", { name: localizedName }));
                    setOpen(false);
                },
                onError: () => toast.error(t("toast.actionFailed", { name: localizedName })),
            },
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={children as React.ReactElement} />
            <PopoverContent side="bottom" align="start" sideOffset={8} className="w-72">
                <div className="space-y-4">
                    {params.map((p) => {
                        const val = values[p.key];
                        const minVal = p.min ?? 0;
                        const maxVal = p.max ?? 100;
                        const range = maxVal - minVal;
                        const fillPercent = range > 0 ? ((val - minVal) / range) * 100 : 0;

                        return (
                            <div key={p.key} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs">{t(`actionParams.${p.key}`, p.label)}</Label>
                                    <span className="text-sm font-semibold tabular-nums leading-none">
                                        {val}
                                        {p.unit && (
                                            <span className="text-xs text-muted-foreground ml-0.5 font-medium">
                                                {p.unit}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="relative py-0.5">
                                    <div
                                        className="absolute top-1/2 left-0 -translate-y-1/2 h-5 rounded-full blur-md pointer-events-none transition-all duration-150"
                                        style={{
                                            width: `${fillPercent}%`,
                                            background: "var(--primary)",
                                            opacity: 0.18,
                                        }}
                                    />
                                    <div className="relative [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:shadow-md">
                                        <Slider
                                            value={[val]}
                                            onValueChange={(value) => {
                                                const v = Array.isArray(value) ? value[0] : value;
                                                setValues((prev) => ({ ...prev, [p.key]: v }));
                                            }}
                                            min={minVal}
                                            max={maxVal}
                                            step={p.step ?? 1}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>
                                        {minVal}
                                        {p.unit && ` ${p.unit}`}
                                    </span>
                                    <span>
                                        {maxVal}
                                        {p.unit && ` ${p.unit}`}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <Button
                    size="sm"
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={executeAction.isPending}
                >
                    {t("handlers.executeAction")}
                </Button>
            </PopoverContent>
        </Popover>
    );
}

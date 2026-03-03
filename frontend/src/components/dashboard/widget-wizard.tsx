import { useQueryClient } from "@tanstack/react-query";
import {
    Activity,
    ChevronLeft,
    CircleCheck,
    Gauge,
    LayoutGrid,
    Loader2,
    Plus,
    Settings2,
    SlidersHorizontal,
    ToggleLeft,
} from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useListActionsApiActionsGet } from "@/api/generated/actions/actions";
import type {
    ActionRead,
    DashboardResponse,
    HandlerRead,
    HandlerTypeInfo,
    ResolvedControl,
} from "@/api/generated/contWatchAPI.schemas";
import {
    useHandlerControlsApiHandlersHandlerIdControlsGet,
    useListHandlersApiHandlersGet,
    useListHandlerTypesApiHandlersTypesGet,
} from "@/api/generated/handlers/handlers";
import {
    getDashboardApiWidgetsDashboardGetQueryKey,
    useCreateSliderApiWidgetsSlidersPost,
    useCreateSwitchApiWidgetsSwitchesPost,
    useCreateTileApiWidgetsTilesPost,
    useCreateWidgetFromControlApiWidgetsFromControlPost,
    useDashboardApiWidgetsDashboardGet,
} from "@/api/generated/widgets/widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useHandlerStatusStore } from "@/stores/handler-status";

type WizardStep = "device" | "widgets" | "manual";

interface WidgetWizardProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function WidgetWizard({ open: controlledOpen, onOpenChange }: WidgetWizardProps) {
    const { t } = useTranslation();
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;

    const [step, setStep] = useState<WizardStep>("device");
    const [selectedHandler, setSelectedHandler] = useState<HandlerRead | null>(null);

    function resetWizard() {
        setStep("device");
        setSelectedHandler(null);
    }

    function handleOpenChange(next: boolean) {
        if (controlledOpen !== undefined) {
            onOpenChange?.(next);
        } else {
            setInternalOpen(next);
        }
        if (!next) resetWizard();
    }

    function handleDeviceSelect(handler: HandlerRead) {
        setSelectedHandler(handler);
        setStep("widgets");
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {controlledOpen === undefined && (
                <DialogTrigger
                    render={
                        <Button size="sm">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            {t("widgetWizard.addWidget")}
                        </Button>
                    }
                />
            )}
            <DialogContent className="sm:max-w-lg">
                {step === "device" && (
                    <DeviceStep onSelect={handleDeviceSelect} onManual={() => setStep("manual")} />
                )}
                {step === "widgets" && selectedHandler && (
                    <WidgetStep
                        handler={selectedHandler}
                        onBack={() => setStep("device")}
                        onClose={() => handleOpenChange(false)}
                    />
                )}
                {step === "manual" && (
                    <ManualStep
                        handler={selectedHandler}
                        onBack={() => (selectedHandler ? setStep("widgets") : setStep("device"))}
                        onClose={() => handleOpenChange(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

/* ─── Step 1: Choose Device ─────────────────────────────────────── */

function DeviceStep({
    onSelect,
    onManual,
}: {
    onSelect: (handler: HandlerRead) => void;
    onManual: () => void;
}) {
    const { t } = useTranslation();
    const { data: handlersData } = useListHandlersApiHandlersGet();
    const { data: dashboardData } = useDashboardApiWidgetsDashboardGet();
    const handlers = (handlersData?.data ?? []) as HandlerRead[];
    const dashboard = dashboardData?.data as DashboardResponse | undefined;
    const handlerStatuses = useHandlerStatusStore((s) => s.statuses);

    function getStatus(handler: HandlerRead) {
        const live = handlerStatuses[handler.id];
        const running = live?.running ?? handler.enabled;
        const connected = live?.connected ?? false;
        if (!running) return "offline" as const;
        if (!connected) return "warning" as const;
        return "online" as const;
    }

    // Count how many attributes/actions a handler already has on the dashboard
    function getExistingCount(handler: HandlerRead) {
        if (!dashboard) return 0;
        const attrIds = new Set((handler.attributes ?? []).map((a) => a.id));
        let count = 0;
        for (const tile of dashboard.tiles) {
            if (attrIds.has(tile.attribute_id)) count++;
        }
        for (const sw of dashboard.switches) {
            if (attrIds.has(sw.attribute_id)) count++;
        }
        for (const sl of dashboard.sliders ?? []) {
            if (attrIds.has(sl.attribute_id)) count++;
        }
        return count;
    }

    if (handlers.length === 0) {
        return (
            <>
                <DialogHeader>
                    <DialogTitle>{t("widgetWizard.addWidget")}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-3 py-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Activity className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">{t("widgetWizard.noDevices")}</p>
                </div>
            </>
        );
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("widgetWizard.addWidget")}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    {t("widgetWizard.chooseDevice")}
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                    {handlers.map((handler) => {
                        const status = getStatus(handler);
                        const existingCount = getExistingCount(handler);
                        const attrCount = (handler.attributes ?? []).length;

                        return (
                            <button
                                key={handler.id}
                                type="button"
                                className={cn(
                                    "relative flex flex-col items-center gap-2.5 rounded-lg border border-l-2 p-4 text-center",
                                    "transition-all duration-200 hover:shadow-md hover:border-primary/50 cursor-pointer overflow-hidden",
                                    status === "online" && "border-l-emerald-500",
                                    status === "warning" && "border-l-amber-500",
                                    status === "offline" && "border-l-muted-foreground/20",
                                )}
                                onClick={() => onSelect(handler)}
                            >
                                {/* Subtle ambient glow for online devices */}
                                {status === "online" && (
                                    <div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                            background:
                                                "radial-gradient(ellipse at 50% 0%, var(--color-emerald-500) 0%, transparent 60%)",
                                            opacity: 0.04,
                                        }}
                                    />
                                )}

                                <DynamicIcon
                                    // biome-ignore lint/suspicious/noExplicitAny: icon name is dynamic from backend
                                    name={(handler.label ? guessHandlerIcon(handler) : "cpu") as any}
                                    fallback={() => (
                                        <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" />
                                    )}
                                    className={cn(
                                        "h-7 w-7 shrink-0",
                                        status === "online"
                                            ? "text-foreground"
                                            : status === "warning"
                                              ? "text-muted-foreground/70"
                                              : "text-muted-foreground/40",
                                    )}
                                />

                                <div className="space-y-0.5 min-w-0 w-full">
                                    <p className="text-sm font-medium truncate">
                                        {handler.label || handler.type}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                        {handler.description || handler.type}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span
                                        className={cn(
                                            "h-1.5 w-1.5 rounded-full shrink-0",
                                            status === "online" && "bg-emerald-500",
                                            status === "warning" && "bg-amber-500",
                                            status === "offline" && "bg-muted-foreground/30",
                                        )}
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                        {attrCount} {t("widgetWizard.attrs")}
                                        {existingCount > 0 && (
                                            <>
                                                {" · "}
                                                {existingCount} {t("widgetWizard.onDashboard")}
                                            </>
                                        )}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
            <DialogFooter className="sm:justify-center">
                <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                    onClick={onManual}
                >
                    <Settings2 className="h-3 w-3" />
                    {t("widgetWizard.manualSetup")}
                </button>
            </DialogFooter>
        </>
    );
}

/** Best-effort icon for a handler based on its type string. */
function guessHandlerIcon(handler: HandlerRead): string {
    const type = handler.type.toLowerCase();
    if (type.includes("shelly") && type.includes("plug")) return "plug";
    if (type.includes("shelly") && type.includes("duo")) return "lightbulb";
    if (type.includes("shelly")) return "zap";
    if (type.includes("bms") || type.includes("battery")) return "battery-medium";
    if (type.includes("inverter") || type.includes("solar") || type.includes("must")) return "sun";
    if (type.includes("serial")) return "cable";
    if (type.includes("http")) return "globe";
    if (type.includes("modbus")) return "cpu";
    return "cpu";
}

/* ─── Step 2: Pick Widgets ──────────────────────────────────────── */

interface WidgetStepProps {
    handler: HandlerRead;
    onBack: () => void;
    onClose: () => void;
}

function WidgetStep({ handler, onBack, onClose }: WidgetStepProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    // Data
    const { data: controlsData, isLoading: controlsLoading } =
        useHandlerControlsApiHandlersHandlerIdControlsGet(handler.id);
    const controls = (controlsData?.data ?? []) as ResolvedControl[];
    const { data: dashboardData } = useDashboardApiWidgetsDashboardGet();
    const dashboard = dashboardData?.data as DashboardResponse | undefined;

    // Mutations
    const createFromControl = useCreateWidgetFromControlApiWidgetsFromControlPost();
    const createTile = useCreateTileApiWidgetsTilesPost();

    // Selection state
    const [selectedControlKeys, setSelectedControlKeys] = useState<Set<string>>(new Set());
    const [selectedAttrIds, setSelectedAttrIds] = useState<Set<number>>(new Set());
    const [isCreating, setIsCreating] = useState(false);

    // Already-on-dashboard checks
    const existingTileAttrIds = useMemo(() => {
        if (!dashboard) return new Set<number>();
        return new Set(dashboard.tiles.map((t) => t.attribute_id));
    }, [dashboard]);

    const existingSwitchAttrIds = useMemo(() => {
        if (!dashboard) return new Set<number>();
        return new Set(dashboard.switches.map((s) => s.attribute_id));
    }, [dashboard]);

    const existingSliderAttrIds = useMemo(() => {
        if (!dashboard) return new Set<number>();
        return new Set((dashboard.sliders ?? []).map((s) => s.attribute_id));
    }, [dashboard]);

    function isControlOnDashboard(control: ResolvedControl) {
        if (!control.attribute_id) return false;
        if (control.type === "switch") return existingSwitchAttrIds.has(control.attribute_id);
        return existingSliderAttrIds.has(control.attribute_id);
    }

    function isAttrOnDashboard(attrId: number) {
        return existingTileAttrIds.has(attrId);
    }

    function toggleControl(key: string) {
        setSelectedControlKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    function toggleAttr(id: number) {
        setSelectedAttrIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    const totalSelected = selectedControlKeys.size + selectedAttrIds.size;

    // Resolved controls — only show those that are fully resolved
    const resolvedControls = controls.filter((c) => c.resolved);

    // Attributes that don't already have a control widget
    const controlAttrIds = new Set(resolvedControls.map((c) => c.attribute_id).filter(Boolean));

    async function handleCreate() {
        setIsCreating(true);
        try {
            // Create control widgets
            for (const key of selectedControlKeys) {
                const control = resolvedControls.find((c) => c.key === key);
                if (!control) continue;
                const localizedLabel = t(`controls.${control.key}`, control.label);
                await createFromControl.mutateAsync({
                    data: { handler_id: handler.id, control_key: key, label: localizedLabel },
                });
            }

            // Create tiles
            for (const attrId of selectedAttrIds) {
                await createTile.mutateAsync({ data: { attribute_id: attrId } });
            }

            queryClient.invalidateQueries({
                queryKey: getDashboardApiWidgetsDashboardGetQueryKey(),
            });

            const count = selectedControlKeys.size + selectedAttrIds.size;
            toast.success(t("widgetWizard.widgetsAdded", { count }));
            onClose();
        } catch {
            toast.error(t("widgetWizard.addFailed"));
        } finally {
            setIsCreating(false);
        }
    }

    // Select all / deselect all
    const allSelectableControlKeys = resolvedControls
        .filter((c) => !isControlOnDashboard(c))
        .map((c) => c.key);
    const allSelectableAttrIds = (handler.attributes ?? [])
        .filter((a) => !isAttrOnDashboard(a.id) && !controlAttrIds.has(a.id))
        .map((a) => a.id);
    const allSelectableCount = allSelectableControlKeys.length + allSelectableAttrIds.length;
    const allSelected = allSelectableCount > 0 && totalSelected === allSelectableCount;

    function toggleAll() {
        if (allSelected) {
            setSelectedControlKeys(new Set());
            setSelectedAttrIds(new Set());
        } else {
            setSelectedControlKeys(new Set(allSelectableControlKeys));
            setSelectedAttrIds(new Set(allSelectableAttrIds));
        }
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <DynamicIcon
                        // biome-ignore lint/suspicious/noExplicitAny: icon name is dynamic from backend
                        name={guessHandlerIcon(handler) as any}
                        fallback={() => <Loader2 className="h-4 w-4 animate-spin" />}
                        className="h-4 w-4 text-muted-foreground"
                    />
                    {handler.label || handler.type}
                </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                {controlsLoading && (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* Controls section */}
                {resolvedControls.length > 0 && (
                    <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
                            {t("widgetWizard.controls")}
                        </h4>
                        <div className="space-y-1.5">
                            {resolvedControls.map((control) => {
                                const onDashboard = isControlOnDashboard(control);
                                const checked = onDashboard || selectedControlKeys.has(control.key);
                                const isSwitch = control.type === "switch";

                                return (
                                    <button
                                        type="button"
                                        key={control.key}
                                        className={cn(
                                            "flex w-full items-center gap-2.5 rounded-lg border border-l-2 px-3 py-2.5 text-left transition-all duration-200 overflow-hidden",
                                            onDashboard
                                                ? "border-l-muted-foreground/15 opacity-50 cursor-default"
                                                : checked
                                                  ? "border-l-primary/60 bg-primary/[0.03] cursor-pointer"
                                                  : "border-l-muted-foreground/15 hover:bg-accent/50 cursor-pointer",
                                        )}
                                        onClick={() => !onDashboard && toggleControl(control.key)}
                                        disabled={onDashboard}
                                    >
                                        <Checkbox
                                            checked={checked}
                                            disabled={onDashboard}
                                            onCheckedChange={() => toggleControl(control.key)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        {control.icon && (
                                            <DynamicIcon
                                                // biome-ignore lint/suspicious/noExplicitAny: icon name is dynamic from backend
                                                name={control.icon as any}
                                                className={cn(
                                                    "h-4 w-4 shrink-0",
                                                    checked ? "text-primary" : "text-muted-foreground",
                                                )}
                                            />
                                        )}
                                        <span className="text-sm font-medium flex-1 min-w-0 truncate">
                                            {t(`controls.${control.key}`, control.label)}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-[10px] px-1.5 py-0 h-5 shrink-0 gap-1",
                                                isSwitch
                                                    ? "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800"
                                                    : "text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800",
                                            )}
                                        >
                                            {isSwitch ? (
                                                <ToggleLeft className="h-3 w-3" />
                                            ) : (
                                                <SlidersHorizontal className="h-3 w-3" />
                                            )}
                                            {isSwitch
                                                ? t("widgetWizard.typeSwitch")
                                                : t("widgetWizard.typeSlider")}
                                        </Badge>
                                        {onDashboard && (
                                            <Badge
                                                variant="secondary"
                                                className="text-[10px] px-1.5 py-0 h-5 shrink-0 gap-1"
                                            >
                                                <CircleCheck className="h-3 w-3" />
                                                {t("widgetWizard.added")}
                                            </Badge>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Separator between sections */}
                {resolvedControls.length > 0 && (handler.attributes ?? []).length > 0 && <Separator />}

                {/* Monitoring tiles section */}
                {(handler.attributes ?? []).length > 0 && (
                    <div>
                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
                            {t("widgetWizard.monitoring")}
                        </h4>
                        <div className="space-y-1">
                            {(handler.attributes ?? [])
                                .filter((attr) => !controlAttrIds.has(attr.id))
                                .map((attr) => {
                                    const onDashboard = isAttrOnDashboard(attr.id);
                                    const checked = onDashboard || selectedAttrIds.has(attr.id);
                                    const displayLabel = attr.label
                                        ? t(`knownAttributes.${attr.name.replace(/[/:]/g, "_")}`, attr.label)
                                        : attr.name;

                                    return (
                                        <button
                                            type="button"
                                            key={attr.id}
                                            className={cn(
                                                "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-all duration-200",
                                                onDashboard
                                                    ? "opacity-50 cursor-default"
                                                    : checked
                                                      ? "bg-primary/[0.03] cursor-pointer"
                                                      : "hover:bg-accent/50 cursor-pointer",
                                            )}
                                            onClick={() => !onDashboard && toggleAttr(attr.id)}
                                            disabled={onDashboard}
                                        >
                                            <Checkbox
                                                checked={checked}
                                                disabled={onDashboard}
                                                onCheckedChange={() => toggleAttr(attr.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            {attr.icon ? (
                                                <DynamicIcon
                                                    // biome-ignore lint/suspicious/noExplicitAny: icon name is dynamic from backend
                                                    name={attr.icon as any}
                                                    className={cn(
                                                        "h-4 w-4 shrink-0",
                                                        checked ? "text-primary" : "text-muted-foreground",
                                                    )}
                                                />
                                            ) : (
                                                <Gauge
                                                    className={cn(
                                                        "h-4 w-4 shrink-0",
                                                        checked ? "text-primary" : "text-muted-foreground",
                                                    )}
                                                />
                                            )}
                                            <span className="text-sm flex-1 min-w-0 truncate">
                                                {displayLabel}
                                            </span>
                                            {attr.unit && (
                                                <span className="text-xs text-muted-foreground shrink-0">
                                                    {attr.unit}
                                                </span>
                                            )}
                                            {onDashboard && (
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] px-1.5 py-0 h-5 shrink-0 gap-1"
                                                >
                                                    <CircleCheck className="h-3 w-3" />
                                                    {t("widgetWizard.added")}
                                                </Badge>
                                            )}
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                )}

                {/* Empty state when nothing to add */}
                {resolvedControls.length === 0 &&
                    (handler.attributes ?? []).filter((a) => !controlAttrIds.has(a.id)).length === 0 && (
                        <div className="flex flex-col items-center gap-2 py-6">
                            <Gauge className="h-6 w-6 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">{t("widgetWizard.noWidgets")}</p>
                        </div>
                    )}
            </div>

            <DialogFooter className="flex-row items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onBack} className="mr-auto">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {t("wizard.back")}
                </Button>
                {allSelectableCount > 1 && (
                    <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs">
                        {allSelected ? t("widgetWizard.deselectAll") : t("widgetWizard.selectAll")}
                    </Button>
                )}
                <Button size="sm" onClick={handleCreate} disabled={totalSelected === 0 || isCreating}>
                    {isCreating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Plus className="h-3.5 w-3.5" />
                    )}
                    {totalSelected > 0
                        ? t("widgetWizard.addCount", { count: totalSelected })
                        : t("widgetWizard.addWidget")}
                </Button>
            </DialogFooter>
        </>
    );
}

/* ─── Step 3: Manual Setup ──────────────────────────────────────── */

type ManualWidgetType = "tile" | "switch" | "slider";

const WIDGET_TYPE_OPTIONS: { type: ManualWidgetType; icon: typeof LayoutGrid; labelKey: string }[] = [
    { type: "tile", icon: LayoutGrid, labelKey: "dashboard.addTile" },
    { type: "switch", icon: ToggleLeft, labelKey: "dashboard.addSwitch" },
    { type: "slider", icon: SlidersHorizontal, labelKey: "dashboard.addSlider" },
];

function ManualStep({
    handler: preselectedHandler,
    onBack,
    onClose,
}: {
    handler: HandlerRead | null;
    onBack: () => void;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [widgetType, setWidgetType] = useState<ManualWidgetType>("tile");

    // Data
    const { data: handlersData } = useListHandlersApiHandlersGet();
    const { data: actionsData } = useListActionsApiActionsGet();
    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();

    const handlers = (handlersData?.data ?? []) as HandlerRead[];
    const allActions = (actionsData?.data ?? []) as ActionRead[];
    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];

    // Handler selection — pre-filled when coming from WidgetStep
    const [handlerId, setHandlerId] = useState<string>(
        preselectedHandler ? String(preselectedHandler.id) : "",
    );

    const selectedHandler = handlers.find((h) => String(h.id) === handlerId) ?? null;

    // Filtered attributes and actions for the selected handler
    const attributes = useMemo(
        () => (selectedHandler ? (selectedHandler.attributes ?? []) : []),
        [selectedHandler],
    );
    const actions = useMemo(
        () => (selectedHandler ? allActions.filter((a) => a.handler_id === selectedHandler.id) : []),
        [selectedHandler, allActions],
    );

    // Tile state
    const [tileAttrId, setTileAttrId] = useState("");

    // Switch state
    const [switchAttrId, setSwitchAttrId] = useState("");
    const [attributeCompare, setAttributeCompare] = useState("");
    const [actionOnId, setActionOnId] = useState("");
    const [actionOffId, setActionOffId] = useState("");

    // Slider state
    const [sliderAttrId, setSliderAttrId] = useState("");
    const [sliderActionId, setSliderActionId] = useState("");
    const [paramKey, setParamKey] = useState("");
    const [min, setMin] = useState("0");
    const [max, setMax] = useState("100");
    const [step, setStep] = useState("1");

    // Reset form fields when handler changes
    function resetFields() {
        setTileAttrId("");
        setSwitchAttrId("");
        setAttributeCompare("");
        setActionOnId("");
        setActionOffId("");
        setSliderAttrId("");
        setSliderActionId("");
        setParamKey("");
        setMin("0");
        setMax("100");
        setStep("1");
    }

    function handleHandlerChange(val: string) {
        setHandlerId(val);
        resetFields();
    }

    // Mutations
    const createTile = useCreateTileApiWidgetsTilesPost();
    const createSwitch = useCreateSwitchApiWidgetsSwitchesPost();
    const createSlider = useCreateSliderApiWidgetsSlidersPost();

    const isPending = createTile.isPending || createSwitch.isPending || createSlider.isPending;

    // Auto-fill for switch
    const tryAutoFillSwitch = useCallback(
        (attrId: string) => {
            if (!selectedHandler) return;
            const attr = attributes.find((a) => String(a.id) === attrId);
            if (!attr) return;
            const ht = handlerTypes.find((t) => t.type === selectedHandler.type);
            if (!ht?.known_controls) return;
            const kc = ht.known_controls.find((c) => c.type === "switch" && c.state_attribute === attr.name);
            if (!kc) return;
            const onAction = kc.action_on ? actions.find((a) => a.name === kc.action_on) : undefined;
            const offAction = kc.action_off ? actions.find((a) => a.name === kc.action_off) : undefined;
            if (kc.state_compare) setAttributeCompare(kc.state_compare);
            if (onAction) setActionOnId(String(onAction.id));
            if (offAction) setActionOffId(String(offAction.id));
        },
        [selectedHandler, attributes, handlerTypes, actions],
    );

    // Auto-fill for slider
    const tryAutoFillSlider = useCallback(
        (attrId: string) => {
            if (!selectedHandler) return;
            const attr = attributes.find((a) => String(a.id) === attrId);
            if (!attr) return;
            const ht = handlerTypes.find((t) => t.type === selectedHandler.type);
            if (!ht?.known_controls) return;
            const kc = ht.known_controls.find((c) => c.type === "slider" && c.state_attribute === attr.name);
            if (!kc) return;
            const act = kc.action ? actions.find((a) => a.name === kc.action) : undefined;
            if (act) setSliderActionId(String(act.id));
            if (kc.param_key) setParamKey(kc.param_key);
            if (kc.min != null) setMin(String(kc.min));
            if (kc.max != null) setMax(String(kc.max));
            if (kc.step != null) setStep(String(kc.step));
        },
        [selectedHandler, attributes, handlerTypes, actions],
    );

    function localizeAction(actionId: string) {
        const action = allActions.find((a) => String(a.id) === actionId);
        if (!action) return "";
        return t(`knownActions.${action.name.replaceAll(" ", "_")}`, action.name);
    }

    function canSubmit() {
        if (!handlerId) return false;
        if (widgetType === "tile") return !!tileAttrId;
        if (widgetType === "switch") return !!switchAttrId;
        return !!sliderAttrId && !!sliderActionId && !!paramKey;
    }

    function handleSubmit() {
        const invalidate = () =>
            queryClient.invalidateQueries({ queryKey: getDashboardApiWidgetsDashboardGetQueryKey() });

        if (widgetType === "tile") {
            createTile.mutate(
                { data: { attribute_id: Number(tileAttrId) } },
                {
                    onSuccess: () => {
                        invalidate();
                        toast.success(t("toast.tileAdded"));
                        onClose();
                    },
                },
            );
        } else if (widgetType === "switch") {
            createSwitch.mutate(
                {
                    data: {
                        attribute_id: Number(switchAttrId),
                        attribute_compare: attributeCompare || undefined,
                        action_on_id: actionOnId ? Number(actionOnId) : undefined,
                        action_off_id: actionOffId ? Number(actionOffId) : undefined,
                    },
                },
                {
                    onSuccess: () => {
                        invalidate();
                        toast.success(t("toast.switchAdded"));
                        onClose();
                    },
                },
            );
        } else {
            createSlider.mutate(
                {
                    data: {
                        attribute_id: Number(sliderAttrId),
                        action_id: Number(sliderActionId),
                        param_key: paramKey,
                        min: Number(min),
                        max: Number(max),
                        step: Number(step),
                    },
                },
                {
                    onSuccess: () => {
                        invalidate();
                        toast.success(t("toast.sliderAdded"));
                        onClose();
                    },
                },
            );
        }
    }

    // Find selected attributes for display in select triggers
    const selectedTileAttr = attributes.find((a) => String(a.id) === tileAttrId);
    const selectedSwitchAttr = attributes.find((a) => String(a.id) === switchAttrId);
    const selectedSliderAttr = attributes.find((a) => String(a.id) === sliderAttrId);

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("widgetWizard.manualSetup")}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                {/* Widget type selector */}
                <div className="flex gap-2">
                    {WIDGET_TYPE_OPTIONS.map(({ type, icon: Icon, labelKey }) => (
                        <button
                            key={type}
                            type="button"
                            className={cn(
                                "flex-1 flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all duration-200 cursor-pointer",
                                widgetType === type
                                    ? "border-primary ring-1 ring-primary bg-primary/[0.03]"
                                    : "hover:border-primary/50 hover:bg-accent/50",
                            )}
                            onClick={() => setWidgetType(type)}
                        >
                            <Icon
                                className={cn(
                                    "h-5 w-5",
                                    widgetType === type ? "text-primary" : "text-muted-foreground",
                                )}
                            />
                            <span className="text-xs font-medium">{t(labelKey)}</span>
                        </button>
                    ))}
                </div>

                <Separator />

                {/* Handler + attribute row */}
                <div className="flex flex-col sm:flex-row gap-3 [&_[data-slot=select-trigger]]:w-full">
                    <div className="space-y-2 flex-1 min-w-0">
                        <Label>{t("widgetWizard.chooseDevice")}</Label>
                        <Select value={handlerId} onValueChange={(v) => handleHandlerChange(v ?? "")}>
                            <SelectTrigger>
                                <SelectValue>
                                    {selectedHandler
                                        ? (selectedHandler.label ?? selectedHandler.type)
                                        : t("widgetWizard.chooseDevice")}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                                {handlers.map((h) => (
                                    <SelectItem key={h.id} value={String(h.id)}>
                                        {h.label ?? h.type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tile attribute */}
                    {widgetType === "tile" && (
                        <div className="space-y-2 flex-1 min-w-0">
                            <Label>{t("dashboard.selectAttribute")}</Label>
                            <Select
                                value={tileAttrId}
                                onValueChange={(v) => setTileAttrId(v ?? "")}
                                disabled={!handlerId}
                            >
                                <SelectTrigger>
                                    <SelectValue>
                                        {selectedTileAttr
                                            ? t(
                                                  `knownAttributes.${selectedTileAttr.name.replace(/[/:]/g, "_")}`,
                                                  selectedTileAttr.label || selectedTileAttr.name,
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
                    )}

                    {/* Switch attribute */}
                    {widgetType === "switch" && (
                        <div className="space-y-2 flex-1 min-w-0">
                            <Label>{t("dashboard.selectAttribute")}</Label>
                            <Select
                                value={switchAttrId}
                                onValueChange={(v) => {
                                    const val = v ?? "";
                                    setSwitchAttrId(val);
                                    tryAutoFillSwitch(val);
                                }}
                                disabled={!handlerId}
                            >
                                <SelectTrigger>
                                    <SelectValue>
                                        {selectedSwitchAttr
                                            ? t(
                                                  `knownAttributes.${selectedSwitchAttr.name.replace(/[/:]/g, "_")}`,
                                                  selectedSwitchAttr.label || selectedSwitchAttr.name,
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
                    )}

                    {/* Slider attribute */}
                    {widgetType === "slider" && (
                        <div className="space-y-2 flex-1 min-w-0">
                            <Label>{t("dashboard.selectAttribute")}</Label>
                            <Select
                                value={sliderAttrId}
                                onValueChange={(v) => {
                                    const val = v ?? "";
                                    setSliderAttrId(val);
                                    tryAutoFillSlider(val);
                                }}
                                disabled={!handlerId}
                            >
                                <SelectTrigger>
                                    <SelectValue>
                                        {selectedSliderAttr
                                            ? t(
                                                  `knownAttributes.${selectedSliderAttr.name.replace(/[/:]/g, "_")}`,
                                                  selectedSliderAttr.label || selectedSliderAttr.name,
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
                    )}
                </div>

                {/* Additional fields — only show once handler is selected */}
                {handlerId && (
                    <>
                        {/* Switch extra fields */}
                        {widgetType === "switch" && (
                            <>
                                <div className="space-y-2">
                                    <Label>{t("dashboard.attributeCompare")}</Label>
                                    <Input
                                        value={attributeCompare}
                                        onChange={(e) => setAttributeCompare(e.target.value)}
                                        placeholder={t("dashboard.attributeCompareHint")}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3 [&_[data-slot=select-trigger]]:w-full">
                                    <div className="space-y-2">
                                        <Label>{t("dashboard.actionOn")}</Label>
                                        <Select
                                            value={actionOnId}
                                            onValueChange={(v) => setActionOnId(v ?? "")}
                                        >
                                            <SelectTrigger>
                                                <SelectValue>
                                                    {actionOnId
                                                        ? localizeAction(actionOnId)
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
                                        <Label>{t("dashboard.actionOff")}</Label>
                                        <Select
                                            value={actionOffId}
                                            onValueChange={(v) => setActionOffId(v ?? "")}
                                        >
                                            <SelectTrigger>
                                                <SelectValue>
                                                    {actionOffId
                                                        ? localizeAction(actionOffId)
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
                                </div>
                            </>
                        )}

                        {/* Slider extra fields */}
                        {widgetType === "slider" && (
                            <>
                                <div className="space-y-2">
                                    <Label>{t("dashboard.selectAction")}</Label>
                                    <Select
                                        value={sliderActionId}
                                        onValueChange={(v) => setSliderActionId(v ?? "")}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue>
                                                {sliderActionId
                                                    ? localizeAction(sliderActionId)
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
                    </>
                )}
            </div>

            <DialogFooter>
                <Button variant="ghost" onClick={onBack}>
                    <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
                    {t("wizard.back")}
                </Button>
                <Button onClick={handleSubmit} disabled={!canSubmit() || isPending} className="ml-auto">
                    {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    {t("common.add")}
                </Button>
            </DialogFooter>
        </>
    );
}

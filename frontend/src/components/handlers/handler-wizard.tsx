import { Check, ChevronLeft, Loader2, Search, Wand2 } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
    CategoryInfo,
    HandlerConfigField,
    HandlerTypeInfo,
    KnownActionInfo,
    KnownAttributeInfo,
    ProbeResult,
} from "@/api/generated/contWatchAPI.schemas";
import {
    useCreateHandlerApiHandlersPost,
    useListCategoriesApiHandlersCategoriesGet,
    useListHandlerTypesApiHandlersTypesGet,
    useProbeHandlerApiHandlersProbePost,
    useSetupHandlerApiHandlersSetupPost,
} from "@/api/generated/handlers/handlers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ConfigFieldInput, convertConfigValues } from "./config-field-input";

type WizardStep = "category" | "connection" | "probing" | "review";

interface ProbeState {
    result: ProbeResult | null;
    category: CategoryInfo;
}

export function HandlerWizard() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<WizardStep>("category");

    const [category, setCategory] = useState<CategoryInfo | null>(null);
    const [probeValues, setProbeValues] = useState<Record<string, string>>({});

    const [probeState, setProbeState] = useState<ProbeState | null>(null);
    const [handlerLabel, setHandlerLabel] = useState("");
    const [configValues, setConfigValues] = useState<Record<string, string>>({});
    const [selectedAttrs, setSelectedAttrs] = useState<Set<string>>(new Set());
    const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());

    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();
    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];

    const probeMutation = useProbeHandlerApiHandlersProbePost();
    const setupMutation = useSetupHandlerApiHandlersSetupPost();

    function resetWizard() {
        setStep("category");
        setCategory(null);
        setProbeValues({});
        setProbeState(null);
        setHandlerLabel("");
        setConfigValues({});
        setSelectedAttrs(new Set());
        setSelectedActions(new Set());
    }

    function handleOpenChange(next: boolean) {
        setOpen(next);
        if (!next) resetWizard();
    }

    function handleCategorySelect(cat: CategoryInfo) {
        setCategory(cat);
        const defaults: Record<string, string> = {};
        for (const field of cat.probe_fields) {
            const firstChoice = field.choices?.[0]?.value;
            defaults[field.key] = firstChoice ?? String(field.default ?? "");
        }
        setProbeValues(defaults);
        setStep("connection");
    }

    function buildProbeConfig(): Record<string, unknown> {
        if (!category) return {};
        return convertConfigValues(category.probe_fields, probeValues);
    }

    function handleProbe() {
        if (!category) return;
        setStep("probing");

        probeMutation.mutate(
            { data: { category: category.name, config: buildProbeConfig() } },
            {
                onSuccess: (resp) => {
                    const result = resp.data as ProbeResult;
                    setProbeState({ result, category });
                    initReviewState(result, category);
                    setStep("review");
                },
                onError: () => {
                    setProbeState({ result: { detected: false }, category });
                    initReviewState({ detected: false }, category);
                    setStep("review");
                },
            },
        );
    }

    const initReviewState = useCallback(
        (result: ProbeResult, cat: CategoryInfo) => {
            setHandlerLabel(result.handler_name ?? cat.default_label);

            const fields = result.config_fields ?? [];
            const defaults: Record<string, string> = {};

            for (const f of fields) {
                defaults[f.key] = String(f.default ?? "");
            }

            // Override connection params with what the user entered
            for (const [key, val] of Object.entries(probeValues)) {
                defaults[key] = val;
            }

            setConfigValues(defaults);

            const attrs = result.known_attributes ?? [];
            setSelectedAttrs(new Set(attrs.map((a) => a.name)));

            const actions = result.known_actions ?? [];
            setSelectedActions(new Set(actions.map((a) => a.name)));
        },
        [probeValues],
    );

    function handleSetup() {
        if (!probeState || !category) return;
        const result = probeState.result;
        const handlerType = result?.handler_type ?? category.default_handler_type;
        const fields = result?.config_fields ?? [];

        const config = convertConfigValues(
            fields.map((f) => ({ key: f.key, type: f.type, label: f.label, default: f.default })),
            configValues,
        );

        const attrs: KnownAttributeInfo[] = (result?.known_attributes ?? []).filter((a) =>
            selectedAttrs.has(a.name),
        );

        const actions: KnownActionInfo[] = (result?.known_actions ?? []).filter((a) =>
            selectedActions.has(a.name),
        );

        setupMutation.mutate(
            {
                data: {
                    type: handlerType,
                    label: handlerLabel || undefined,
                    config,
                    enabled: true,
                    attributes: attrs,
                    actions,
                },
            },
            {
                onSuccess: () => {
                    handleOpenChange(false);
                    toast.success(t("toast.handlerCreated"));
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button size="sm">
                        <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                        {t("handlers.addHandler")}
                    </Button>
                }
            />
            <DialogContent className="sm:max-w-lg">
                {step === "category" && (
                    <CategoryStep onSelect={handleCategorySelect} onClose={() => handleOpenChange(false)} />
                )}
                {step === "connection" && category && (
                    <ConnectionStep
                        category={category}
                        probeValues={probeValues}
                        onProbeValueChange={(k, v) => setProbeValues((prev) => ({ ...prev, [k]: v }))}
                        onBack={() => setStep("category")}
                        onProbe={handleProbe}
                    />
                )}
                {step === "probing" && <ProbingStep />}
                {step === "review" && probeState && (
                    <ReviewStep
                        probeState={probeState}
                        handlerTypes={handlerTypes}
                        label={handlerLabel}
                        onLabelChange={setHandlerLabel}
                        configValues={configValues}
                        onConfigValueChange={(k, v) => setConfigValues((prev) => ({ ...prev, [k]: v }))}
                        selectedAttrs={selectedAttrs}
                        onToggleAttr={(name) =>
                            setSelectedAttrs((prev) => {
                                const next = new Set(prev);
                                if (next.has(name)) next.delete(name);
                                else next.add(name);
                                return next;
                            })
                        }
                        selectedActions={selectedActions}
                        onToggleAction={(name) =>
                            setSelectedActions((prev) => {
                                const next = new Set(prev);
                                if (next.has(name)) next.delete(name);
                                else next.add(name);
                                return next;
                            })
                        }
                        onBack={() => setStep("connection")}
                        onSubmit={handleSetup}
                        isPending={setupMutation.isPending}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function CategoryStep({ onSelect, onClose }: { onSelect: (cat: CategoryInfo) => void; onClose: () => void }) {
    const { t } = useTranslation();
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [selectedType, setSelectedType] = useState<string>("");
    const [configValues, setConfigValues] = useState<Record<string, string>>({});

    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();
    const { data: categoriesData } = useListCategoriesApiHandlersCategoriesGet();
    const createHandler = useCreateHandlerApiHandlersPost();

    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];
    const categories = (categoriesData?.data ?? []) as CategoryInfo[];
    const selectedTypeInfo = handlerTypes.find((ht) => ht.type === selectedType);

    function handleTypeChange(value: string | null) {
        if (!value) return;
        setSelectedType(value);
        const info = handlerTypes.find((ht) => ht.type === value);
        if (info) {
            const defaults: Record<string, string> = {};
            for (const field of info.config_fields) {
                defaults[field.key] = String(field.default ?? "");
            }
            setConfigValues(defaults);
        }
    }

    function handleAdvancedCreate() {
        if (!selectedType) return;
        const config = convertConfigValues(selectedTypeInfo?.config_fields ?? [], configValues);
        createHandler.mutate(
            { data: { type: selectedType, options: { config }, enabled: true } },
            {
                onSuccess: () => {
                    toast.success(t("toast.handlerCreated"));
                    onClose();
                },
            },
        );
    }

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("wizard.chooseCategory")}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-4">
                {categories.map((cat) => (
                    <Card
                        key={cat.name}
                        className="cursor-pointer transition-all hover:shadow-md hover:border-primary py-0"
                        onClick={() => onSelect(cat)}
                    >
                        <CardContent className="flex flex-col items-center gap-2 p-6">
                            <DynamicIcon
                                // biome-ignore lint/suspicious/noExplicitAny: icon name is dynamic from backend
                                name={cat.icon as any}
                                fallback={() => (
                                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                                )}
                                className="h-8 w-8 text-muted-foreground"
                            />
                            <span className="text-sm font-medium">{cat.label}</span>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Separator />
            <div>
                <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                >
                    {showAdvanced ? t("wizard.hideAdvanced") : t("handlers.advancedSetup")}
                </button>
                {showAdvanced && (
                    <div className="space-y-4 mt-3">
                        <div className="space-y-2">
                            <Label>{t("handlers.type")}</Label>
                            <Select value={selectedType} onValueChange={handleTypeChange}>
                                <SelectTrigger>
                                    <SelectValue>
                                        {selectedType
                                            ? handlerTypes.find((ht) => ht.type === selectedType)?.name
                                            : t("handlers.selectType")}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {handlerTypes.map((ht) => (
                                        <SelectItem key={ht.type} value={ht.type}>
                                            {ht.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedTypeInfo?.config_fields.map((field: HandlerConfigField) => (
                            <div key={field.key} className="space-y-1">
                                <Label className="text-xs">{field.label}</Label>
                                <ConfigFieldInput
                                    field={field}
                                    value={configValues[field.key] ?? ""}
                                    onChange={(v) => setConfigValues((prev) => ({ ...prev, [field.key]: v }))}
                                />
                            </div>
                        ))}
                        <div className="flex justify-end">
                            <Button
                                onClick={handleAdvancedCreate}
                                disabled={!selectedType || createHandler.isPending}
                            >
                                {t("handlers.createHandler")}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function ConnectionStep({
    category,
    probeValues,
    onProbeValueChange,
    onBack,
    onProbe,
}: {
    category: CategoryInfo;
    probeValues: Record<string, string>;
    onProbeValueChange: (key: string, value: string) => void;
    onBack: () => void;
    onProbe: () => void;
}) {
    const { t } = useTranslation();
    const hasRequiredValues = category.probe_fields.some((f) => probeValues[f.key]);

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("wizard.connectionDetails")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                {category.probe_fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                        <Label>{field.label}</Label>
                        <ConfigFieldInput
                            field={field}
                            value={probeValues[field.key] ?? ""}
                            onChange={(v) => onProbeValueChange(field.key, v)}
                        />
                    </div>
                ))}
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onBack}>
                    <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
                    {t("wizard.back")}
                </Button>
                <Button onClick={onProbe} disabled={!hasRequiredValues}>
                    <Search className="mr-1.5 h-3.5 w-3.5" />
                    {t("wizard.detectDevice")}
                </Button>
            </DialogFooter>
        </>
    );
}

function ProbingStep() {
    const { t } = useTranslation();
    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("wizard.detecting")}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("wizard.detectingDescription")}</p>
            </div>
        </>
    );
}

function ReviewStep({
    probeState,
    handlerTypes,
    label,
    onLabelChange,
    configValues,
    onConfigValueChange,
    selectedAttrs,
    onToggleAttr,
    selectedActions,
    onToggleAction,
    onBack,
    onSubmit,
    isPending,
}: {
    probeState: ProbeState;
    handlerTypes: HandlerTypeInfo[];
    label: string;
    onLabelChange: (v: string) => void;
    configValues: Record<string, string>;
    onConfigValueChange: (key: string, value: string) => void;
    selectedAttrs: Set<string>;
    onToggleAttr: (name: string) => void;
    selectedActions: Set<string>;
    onToggleAction: (name: string) => void;
    onBack: () => void;
    onSubmit: () => void;
    isPending: boolean;
}) {
    const { t } = useTranslation();
    const result = probeState.result;
    const detected = result?.detected ?? false;
    const knownAttrs = result?.known_attributes ?? [];
    const knownActions = result?.known_actions ?? [];
    const configFields = result?.config_fields ?? [];
    const [showAdvanced, setShowAdvanced] = useState(false);

    // For non-detected handlers, derive fallback fields from the default handler type
    const fallbackFields: HandlerConfigField[] =
        configFields.length > 0
            ? configFields
            : (handlerTypes.find((ht) => ht.type === probeState.category.default_handler_type)
                  ?.config_fields ?? []);

    return (
        <>
            <DialogHeader>
                <DialogTitle>{t("wizard.review")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                {detected ? (
                    <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 px-3 py-2">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium">
                            {t("wizard.detected", { name: result?.handler_name })}
                        </span>
                    </div>
                ) : (
                    <div className="rounded-md border px-3 py-2">
                        <span className="text-sm text-muted-foreground">{t("wizard.notDetected")}</span>
                    </div>
                )}

                <div className="space-y-2">
                    <Label>{t("handlers.label")}</Label>
                    <Input value={label} onChange={(e) => onLabelChange(e.target.value)} />
                </div>

                <div>
                    <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                        {showAdvanced ? t("wizard.hideAdvanced") : t("wizard.showAdvanced")}
                    </button>
                    {showAdvanced && (
                        <div className="space-y-3 mt-3">
                            {fallbackFields.map((field) => (
                                <div key={field.key} className="space-y-1">
                                    <Label className="text-xs">{field.label}</Label>
                                    <ConfigFieldInput
                                        field={field}
                                        value={configValues[field.key] ?? ""}
                                        onChange={(v) => onConfigValueChange(field.key, v)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {knownAttrs.length > 0 && (
                    <>
                        <Separator />
                        <div>
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
                                {t("wizard.attributes")}
                            </h4>
                            <div className="space-y-1.5">
                                {knownAttrs.map((attr) => (
                                    <div
                                        key={attr.name}
                                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
                                    >
                                        <Checkbox
                                            checked={selectedAttrs.has(attr.name)}
                                            onCheckedChange={() => onToggleAttr(attr.name)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm">{attr.label || attr.name}</span>
                                            {attr.unit && (
                                                <span className="text-xs text-muted-foreground ml-1">
                                                    ({attr.unit})
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {attr.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {knownActions.length > 0 && (
                    <>
                        <Separator />
                        <div>
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
                                {t("wizard.actions")}
                            </h4>
                            <div className="space-y-1.5">
                                {knownActions.map((action) => (
                                    <div
                                        key={action.name}
                                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
                                    >
                                        <Checkbox
                                            checked={selectedActions.has(action.name)}
                                            onCheckedChange={() => onToggleAction(action.name)}
                                        />
                                        <span className="text-sm">{action.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {!detected && knownAttrs.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t("wizard.genericNote")}</p>
                )}
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={onBack}>
                    <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
                    {t("wizard.back")}
                </Button>
                <Button onClick={onSubmit} disabled={isPending}>
                    {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    {t("wizard.createDevice")}
                </Button>
            </DialogFooter>
        </>
    );
}

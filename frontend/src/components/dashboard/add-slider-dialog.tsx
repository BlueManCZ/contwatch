import { useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useListActionsApiActionsGet } from "@/api/generated/actions/actions";
import { useListAttributesApiAttributesGet } from "@/api/generated/attributes/attributes";
import type {
    ActionRead,
    AttributeRead,
    HandlerRead,
    HandlerTypeInfo,
} from "@/api/generated/contWatchAPI.schemas";
import {
    useListHandlersApiHandlersGet,
    useListHandlerTypesApiHandlersTypesGet,
} from "@/api/generated/handlers/handlers";
import {
    getListSlidersApiWidgetsSlidersGetQueryKey,
    useCreateSliderApiWidgetsSlidersPost,
} from "@/api/generated/widgets/widgets";
import { Button } from "@/components/ui/button";
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
import { localizeAttributeLabel } from "@/lib/localize-attribute";

interface AddSliderDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AddSliderDialog({ open: controlledOpen, onOpenChange }: AddSliderDialogProps = {}) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;

    const [selectedAttrId, setSelectedAttrId] = useState("");
    const [selectedActionId, setSelectedActionId] = useState("");
    const [paramKey, setParamKey] = useState("");
    const [min, setMin] = useState("0");
    const [max, setMax] = useState("100");
    const [step, setStep] = useState("1");
    const { data: attrsData } = useListAttributesApiAttributesGet(undefined);
    const { data: actionsData } = useListActionsApiActionsGet();
    const { data: handlersData } = useListHandlersApiHandlersGet();
    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();
    const createSlider = useCreateSliderApiWidgetsSlidersPost();

    const attributes = (attrsData?.data ?? []) as AttributeRead[];
    const actions = (actionsData?.data ?? []) as ActionRead[];
    const handlers = (handlersData?.data ?? []) as HandlerRead[];
    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];

    function resetForm() {
        setSelectedAttrId("");
        setSelectedActionId("");
        setParamKey("");
        setMin("0");
        setMax("100");
        setStep("1");
    }

    const tryAutoFill = useCallback(
        (attrId: string) => {
            const attr = attributes.find((a) => String(a.id) === attrId);
            if (!attr) return;
            const handler = handlers.find((h) => h.id === attr.handler_id);
            if (!handler) return;
            const ht = handlerTypes.find((t) => t.type === handler.type);
            if (!ht?.known_controls) return;
            const kc = ht.known_controls.find((c) => c.type === "slider" && c.state_attribute === attr.name);
            if (!kc) return;
            const handlerActions = actions.filter((a) => a.handler_id === handler.id);
            const act = kc.action ? handlerActions.find((a) => a.name === kc.action) : undefined;
            if (act) setSelectedActionId(String(act.id));
            if (kc.param_key) setParamKey(kc.param_key);
            if (kc.min != null) setMin(String(kc.min));
            if (kc.max != null) setMax(String(kc.max));
            if (kc.step != null) setStep(String(kc.step));
        },
        [attributes, handlers, handlerTypes, actions],
    );

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedAttrId || !selectedActionId || !paramKey) return;
        createSlider.mutate(
            {
                data: {
                    attribute_id: Number(selectedAttrId),
                    action_id: Number(selectedActionId),
                    param_key: paramKey,
                    min: Number(min),
                    max: Number(max),
                    step: Number(step),
                },
            },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({
                        queryKey: getListSlidersApiWidgetsSlidersGetQueryKey(),
                    });
                    setOpen(false);
                    resetForm();
                    toast.success(t("toast.sliderAdded"));
                },
            },
        );
    }

    const selectedAttr = attributes.find((a) => String(a.id) === selectedAttrId);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {controlledOpen === undefined && (
                <DialogTrigger
                    render={
                        <Button variant="outline" size="sm">
                            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                            {t("dashboard.addSlider")}
                        </Button>
                    }
                />
            )}
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("dashboard.addSlider")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("dashboard.selectAttribute")}</Label>
                            <Select
                                value={selectedAttrId}
                                onValueChange={(v) => {
                                    const val = v ?? "";
                                    setSelectedAttrId(val);
                                    tryAutoFill(val);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue>
                                        {selectedAttr
                                            ? localizeAttributeLabel(
                                                  selectedAttr.name,
                                                  selectedAttr.label,
                                                  t,
                                                  i18n,
                                              )
                                            : t("dashboard.selectAttribute")}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                    {attributes.map((attr) => (
                                        <SelectItem key={attr.id} value={String(attr.id)}>
                                            {localizeAttributeLabel(attr.name, attr.label, t, i18n)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("dashboard.selectAction")}</Label>
                            <Select
                                value={selectedActionId}
                                onValueChange={(v) => setSelectedActionId(v ?? "")}
                            >
                                <SelectTrigger>
                                    <SelectValue>
                                        {selectedActionId
                                            ? t(
                                                  `knownActions.${actions.find((a) => String(a.id) === selectedActionId)?.name?.replaceAll(" ", "_")}`,
                                                  actions.find((a) => String(a.id) === selectedActionId)
                                                      ?.name ?? "",
                                              )
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
                                <Input type="number" value={min} onChange={(e) => setMin(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("dashboard.sliderMax")}</Label>
                                <Input type="number" value={max} onChange={(e) => setMax(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("dashboard.sliderStep")}</Label>
                                <Input type="number" value={step} onChange={(e) => setStep(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={
                                !selectedAttrId || !selectedActionId || !paramKey || createSlider.isPending
                            }
                        >
                            {t("common.add")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

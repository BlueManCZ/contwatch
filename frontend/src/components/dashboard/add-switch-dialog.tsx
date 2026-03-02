import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
    getListSwitchesApiWidgetsSwitchesGetQueryKey,
    useCreateSwitchApiWidgetsSwitchesPost,
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

interface AddSwitchDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function AddSwitchDialog({ open: controlledOpen, onOpenChange }: AddSwitchDialogProps = {}) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;
    const [selectedAttrId, setSelectedAttrId] = useState<string>("");
    const [attributeCompare, setAttributeCompare] = useState("");
    const [actionOnId, setActionOnId] = useState<string>("");
    const [actionOffId, setActionOffId] = useState<string>("");

    const { data: attrsData } = useListAttributesApiAttributesGet(undefined);
    const { data: actionsData } = useListActionsApiActionsGet();
    const { data: handlersData } = useListHandlersApiHandlersGet();
    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();
    const createSwitch = useCreateSwitchApiWidgetsSwitchesPost();

    const attributes = (attrsData?.data ?? []) as AttributeRead[];
    const actions = (actionsData?.data ?? []) as ActionRead[];
    const handlers = (handlersData?.data ?? []) as HandlerRead[];
    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];

    function resetForm() {
        setSelectedAttrId("");
        setAttributeCompare("");
        setActionOnId("");
        setActionOffId("");
    }

    const tryAutoFill = useCallback(
        (attrId: string) => {
            const attr = attributes.find((a) => String(a.id) === attrId);
            if (!attr) return;
            const handler = handlers.find((h) => h.id === attr.handler_id);
            if (!handler) return;
            const ht = handlerTypes.find((t) => t.type === handler.type);
            if (!ht?.known_controls) return;
            const kc = ht.known_controls.find((c) => c.type === "switch" && c.state_attribute === attr.name);
            if (!kc) return;
            const handlerActions = actions.filter((a) => a.handler_id === handler.id);
            const onAction = kc.action_on ? handlerActions.find((a) => a.name === kc.action_on) : undefined;
            const offAction = kc.action_off
                ? handlerActions.find((a) => a.name === kc.action_off)
                : undefined;
            if (kc.state_compare) setAttributeCompare(kc.state_compare);
            if (onAction) setActionOnId(String(onAction.id));
            if (offAction) setActionOffId(String(offAction.id));
        },
        [attributes, handlers, handlerTypes, actions],
    );

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedAttrId) return;
        createSwitch.mutate(
            {
                data: {
                    attribute_id: Number(selectedAttrId),
                    attribute_compare: attributeCompare || undefined,
                    action_on_id: actionOnId ? Number(actionOnId) : undefined,
                    action_off_id: actionOffId ? Number(actionOffId) : undefined,
                },
            },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({
                        queryKey: getListSwitchesApiWidgetsSwitchesGetQueryKey(),
                    });
                    setOpen(false);
                    resetForm();
                    toast.success(t("toast.switchAdded"));
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
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            {t("dashboard.addSwitch")}
                        </Button>
                    }
                />
            )}
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("dashboard.addSwitch")}</DialogTitle>
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
                                            ? `${selectedAttr.label || selectedAttr.name}`
                                            : t("dashboard.selectAttribute")}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                    {attributes.map((attr) => (
                                        <SelectItem key={attr.id} value={String(attr.id)}>
                                            {attr.label || attr.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("dashboard.attributeCompare")}</Label>
                            <Input
                                value={attributeCompare}
                                onChange={(e) => setAttributeCompare(e.target.value)}
                                placeholder={t("dashboard.attributeCompareHint")}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>{t("dashboard.actionOn")}</Label>
                                <Select value={actionOnId} onValueChange={(v) => setActionOnId(v ?? "")}>
                                    <SelectTrigger>
                                        <SelectValue>
                                            {actionOnId
                                                ? t(
                                                      `knownActions.${actions.find((a) => String(a.id) === actionOnId)?.name?.replaceAll(" ", "_")}`,
                                                      actions.find((a) => String(a.id) === actionOnId)
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
                                <Label>{t("dashboard.actionOff")}</Label>
                                <Select value={actionOffId} onValueChange={(v) => setActionOffId(v ?? "")}>
                                    <SelectTrigger>
                                        <SelectValue>
                                            {actionOffId
                                                ? t(
                                                      `knownActions.${actions.find((a) => String(a.id) === actionOffId)?.name?.replaceAll(" ", "_")}`,
                                                      actions.find((a) => String(a.id) === actionOffId)
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
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={!selectedAttrId || createSwitch.isPending}>
                            {t("common.add")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

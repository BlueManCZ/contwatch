import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useListActionsApiActionsGet } from "@/api/generated/actions/actions";
import { useListAttributesApiAttributesGet } from "@/api/generated/attributes/attributes";
import type { ActionRead, AttributeRead } from "@/api/generated/contWatchAPI.schemas";
import { useCreateSwitchApiWidgetsSwitchesPost } from "@/api/generated/widgets/widgets";
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
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const setOpen = onOpenChange ?? setInternalOpen;
    const [name, setName] = useState("");
    const [selectedAttrId, setSelectedAttrId] = useState<string>("");
    const [attributeCompare, setAttributeCompare] = useState("");
    const [actionOnId, setActionOnId] = useState<string>("");
    const [actionOffId, setActionOffId] = useState<string>("");

    const { data: attrsData } = useListAttributesApiAttributesGet(undefined);
    const { data: actionsData } = useListActionsApiActionsGet();
    const createSwitch = useCreateSwitchApiWidgetsSwitchesPost();

    const attributes = (attrsData?.data ?? []) as AttributeRead[];
    const actions = (actionsData?.data ?? []) as ActionRead[];

    function resetForm() {
        setName("");
        setSelectedAttrId("");
        setAttributeCompare("");
        setActionOnId("");
        setActionOffId("");
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedAttrId) return;
        createSwitch.mutate(
            {
                data: {
                    name: name || undefined,
                    attribute_id: Number(selectedAttrId),
                    attribute_compare: attributeCompare || undefined,
                    action_on_id: actionOnId ? Number(actionOnId) : undefined,
                    action_off_id: actionOffId ? Number(actionOffId) : undefined,
                },
            },
            {
                onSuccess: () => {
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
                            <Label>{t("dashboard.switchName")}</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t("dashboard.switchName")}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t("dashboard.selectAttribute")}</Label>
                            <Select value={selectedAttrId} onValueChange={(v) => setSelectedAttrId(v ?? "")}>
                                <SelectTrigger>
                                    <SelectValue>
                                        {selectedAttr
                                            ? `${selectedAttr.label || selectedAttr.name}`
                                            : t("dashboard.selectAttribute")}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
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
                                                ? actions.find((a) => String(a.id) === actionOnId)?.name
                                                : t("dashboard.selectAction")}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {actions.map((action) => (
                                            <SelectItem key={action.id} value={String(action.id)}>
                                                {action.name}
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
                                                ? actions.find((a) => String(a.id) === actionOffId)?.name
                                                : t("dashboard.selectAction")}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {actions.map((action) => (
                                            <SelectItem key={action.id} value={String(action.id)}>
                                                {action.name}
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

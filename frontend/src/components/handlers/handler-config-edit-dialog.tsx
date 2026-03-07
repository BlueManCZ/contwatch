import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { HandlerConfigField, HandlerRead, HandlerTypeInfo } from "@/api/generated/contWatchAPI.schemas";
import {
    getListHandlersApiHandlersGetQueryKey,
    useListHandlerTypesApiHandlersTypesGet,
    useUpdateHandlerApiHandlersHandlerIdPatch,
} from "@/api/generated/handlers/handlers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConfigFieldInput, convertConfigValues } from "./config-field-input";

interface HandlerConfigEditDialogProps {
    handler: HandlerRead | null;
    onClose: () => void;
}

export function HandlerConfigEditDialog({ handler, onClose }: HandlerConfigEditDialogProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [label, setLabel] = useState("");
    const [confirmActions, setConfirmActions] = useState(false);
    const [configValues, setConfigValues] = useState<Record<string, string>>({});
    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();
    const updateHandler = useUpdateHandlerApiHandlersHandlerIdPatch();

    const open = handler !== null;
    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];
    const configFields = useMemo(
        () => (handler ? (handlerTypes.find((ht) => ht.type === handler.type)?.config_fields ?? []) : []),
        [handler, handlerTypes],
    );

    function handleOpenChange(next: boolean) {
        if (!next) onClose();
    }

    useEffect(() => {
        if (handler) {
            setLabel(handler.label ?? "");
            setConfirmActions(handler.confirm_actions ?? false);
            const currentConfig = (handler.options?.config ?? {}) as Record<string, unknown>;
            const stringValues: Record<string, string> = {};
            for (const field of configFields) {
                stringValues[field.key] = String(currentConfig[field.key] ?? field.default ?? "");
            }
            setConfigValues(stringValues);
        }
    }, [handler, configFields]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!handler) return;

        const config = convertConfigValues(configFields, configValues);

        updateHandler.mutate(
            {
                handlerId: handler.id,
                data: {
                    label: label || undefined,
                    confirm_actions: confirmActions,
                    options: { ...handler.options, config },
                },
            },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({
                        queryKey: getListHandlersApiHandlersGetQueryKey(),
                    });
                    onClose();
                    toast.success(t("toast.handlerUpdated"));
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("handlers.editConfig")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="handler-label">{t("handlers.label")}</Label>
                            <Input
                                id="handler-label"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder={t("handlers.label")}
                            />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <Label htmlFor="confirm-actions">{t("handlers.confirmActions")}</Label>
                                <p className="text-xs text-muted-foreground">
                                    {t("handlers.confirmActionsDescription")}
                                </p>
                            </div>
                            <Switch
                                id="confirm-actions"
                                checked={confirmActions}
                                onCheckedChange={setConfirmActions}
                            />
                        </div>
                        {configFields.map((field: HandlerConfigField) => (
                            <div key={field.key} className="space-y-2">
                                <Label htmlFor={field.key}>{t(`fields.${field.key}`, field.label)}</Label>
                                <ConfigFieldInput
                                    field={field}
                                    value={configValues[field.key] ?? ""}
                                    onChange={(v) => setConfigValues((prev) => ({ ...prev, [field.key]: v }))}
                                />
                            </div>
                        ))}
                        {configFields.length === 0 && (
                            <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={updateHandler.isPending}>
                            {t("common.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

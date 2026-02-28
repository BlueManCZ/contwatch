import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { HandlerConfigField, HandlerRead, HandlerTypeInfo } from "@/api/generated/contWatchAPI.schemas";
import {
    useListHandlerTypesApiHandlersTypesGet,
    useUpdateHandlerApiHandlersHandlerIdPatch,
} from "@/api/generated/handlers/handlers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ConfigFieldInput, convertConfigValues } from "./config-field-input";

interface HandlerConfigEditDialogProps {
    handler: HandlerRead | null;
    onClose: () => void;
}

export function HandlerConfigEditDialog({ handler, onClose }: HandlerConfigEditDialogProps) {
    const { t } = useTranslation();
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
                data: { options: { ...handler.options, config } },
            },
            {
                onSuccess: () => {
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
                        {configFields.map((field: HandlerConfigField) => (
                            <div key={field.key} className="space-y-2">
                                <Label htmlFor={field.key}>{field.label}</Label>
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
                        <Button type="submit" disabled={configFields.length === 0 || updateHandler.isPending}>
                            {t("common.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

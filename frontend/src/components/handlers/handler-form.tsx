import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { HandlerConfigField, HandlerTypeInfo } from "@/api/generated/contWatchAPI.schemas";
import {
    useCreateHandlerApiHandlersPost,
    useListHandlerTypesApiHandlersTypesGet,
} from "@/api/generated/handlers/handlers";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfigFieldInput, convertConfigValues } from "./config-field-input";

export function HandlerForm() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<string>("");
    const [configValues, setConfigValues] = useState<Record<string, string>>({});

    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();
    const createHandler = useCreateHandlerApiHandlersPost();

    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];
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

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedType) return;

        const config = convertConfigValues(selectedTypeInfo?.config_fields ?? [], configValues);

        createHandler.mutate(
            { data: { type: selectedType, options: { config }, enabled: true } },
            {
                onSuccess: () => {
                    setOpen(false);
                    setSelectedType("");
                    setConfigValues({});
                    toast.success(t("toast.handlerCreated"));
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("handlers.addHandler")}
                    </Button>
                }
            />
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("handlers.createHandler")}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
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
                            <div key={field.key} className="grid gap-2">
                                <Label htmlFor={field.key}>{field.label}</Label>
                                <ConfigFieldInput
                                    field={field}
                                    value={configValues[field.key] ?? ""}
                                    onChange={(v) => setConfigValues((prev) => ({ ...prev, [field.key]: v }))}
                                />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={!selectedType || createHandler.isPending}>
                            {t("handlers.createHandler")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

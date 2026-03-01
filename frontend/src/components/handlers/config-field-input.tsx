import { useTranslation } from "react-i18next";
import type { HandlerConfigField } from "@/api/generated/contWatchAPI.schemas";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ConfigFieldInput({
    field,
    value,
    onChange,
}: {
    field: HandlerConfigField;
    value: string;
    onChange: (v: string) => void;
}) {
    const { t } = useTranslation();

    if (field.choices && field.choices.length > 0) {
        return (
            <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
                <SelectTrigger>
                    <SelectValue>{field.choices.find((c) => c.value === value)?.label ?? value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {field.choices.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                            {c.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    if (field.type === "bool") {
        return (
            <Select value={value} onValueChange={(v) => onChange(v ?? "false")}>
                <SelectTrigger>
                    <SelectValue>
                        {value === "true" ? t("common.yes", "Yes") : t("common.no", "No")}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="true">{t("common.yes", "Yes")}</SelectItem>
                    <SelectItem value="false">{t("common.no", "No")}</SelectItem>
                </SelectContent>
            </Select>
        );
    }

    return (
        <Input
            id={field.key}
            type={field.type === "int" || field.type === "float" ? "number" : "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}

export function convertConfigValues(
    fields: HandlerConfigField[],
    rawValues: Record<string, string>,
): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    for (const field of fields) {
        const raw = rawValues[field.key] ?? "";
        if (field.type === "int") config[field.key] = Number.parseInt(raw, 10) || 0;
        else if (field.type === "float") config[field.key] = Number.parseFloat(raw) || 0;
        else if (field.type === "bool") config[field.key] = raw === "true";
        else config[field.key] = raw;
    }
    return config;
}

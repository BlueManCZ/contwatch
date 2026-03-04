import { useTranslation } from "react-i18next";
import { useListAttributesApiAttributesGet } from "@/api/generated/attributes/attributes";
import type { AttributeRead } from "@/api/generated/contWatchAPI.schemas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localizeAttributeLabel } from "@/lib/localize-attribute";

interface AttributeSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    showUnit?: boolean;
}

export function AttributeSelect({ value, onValueChange, showUnit }: AttributeSelectProps) {
    const { t, i18n } = useTranslation();
    const { data: attrsData } = useListAttributesApiAttributesGet(undefined);
    const attributes = (attrsData?.data ?? []) as AttributeRead[];
    const selected = attributes.find((a) => String(a.id) === value);

    return (
        <Select value={value} onValueChange={(v) => onValueChange(v ?? "")}>
            <SelectTrigger>
                <SelectValue>
                    {selected
                        ? `${localizeAttributeLabel(selected.name, selected.label, t, i18n)}${showUnit && selected.unit ? ` (${selected.unit})` : ""}`
                        : t("dashboard.selectAttribute")}
                </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
                {attributes.map((attr) => (
                    <SelectItem key={attr.id} value={String(attr.id)}>
                        {localizeAttributeLabel(attr.name, attr.label, t, i18n)}
                        {showUnit && attr.unit ? ` (${attr.unit})` : ""}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

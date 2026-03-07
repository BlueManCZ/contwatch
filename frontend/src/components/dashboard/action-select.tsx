import { useTranslation } from "react-i18next";
import { useListActionsApiActionsGet } from "@/api/generated/actions/actions";
import type { ActionRead } from "@/api/generated/contWatchAPI.schemas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ActionSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
}

export function ActionSelect({ value, onValueChange, placeholder }: ActionSelectProps) {
    const { t } = useTranslation();
    const { data: actionsData } = useListActionsApiActionsGet();
    const actions = (actionsData?.data ?? []) as ActionRead[];
    const selected = actions.find((a) => String(a.id) === value);

    return (
        <Select value={value} onValueChange={(v) => onValueChange(v ?? "")}>
            <SelectTrigger>
                <SelectValue>
                    {selected
                        ? t(`knownActions.${selected.name.replaceAll(" ", "_")}`, selected.name)
                        : (placeholder ?? t("dashboard.selectAction"))}
                </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
                {actions.map((action) => (
                    <SelectItem key={action.id} value={String(action.id)}>
                        {t(`knownActions.${action.name.replaceAll(" ", "_")}`, action.name)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

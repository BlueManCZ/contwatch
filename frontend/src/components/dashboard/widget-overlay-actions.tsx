import { Pencil, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WidgetOverlayActionsProps {
    onEdit?: () => void;
    onRemove?: () => void;
}

export function WidgetOverlayActions({ onEdit, onRemove }: WidgetOverlayActionsProps) {
    const { t } = useTranslation();

    if (!onEdit && !onRemove) return null;

    return (
        <div className="absolute top-2 right-2 hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
            {onEdit && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                    title={t("common.edit")}
                >
                    <Pencil className="h-3 w-3" />
                </button>
            )}
            {onRemove && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive-foreground hover:bg-destructive/10 transition-all cursor-pointer"
                    title={t("common.delete")}
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}

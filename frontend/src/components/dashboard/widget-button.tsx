import { Pencil, Play, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { DashboardWidget } from "@/api/generated/contWatchAPI.schemas";
import { useExecuteButtonApiWidgetsWidgetIdExecutePost } from "@/api/generated/widgets/widgets";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SafeIcon } from "@/components/safe-icon";
import { Card, CardContent } from "@/components/ui/card";
import { boldName } from "@/lib/utils";
import type { WidgetStatus } from "@/lib/widget-status";

interface WidgetButtonProps {
    widget: DashboardWidget;
    status?: WidgetStatus;
    onRemove?: () => void;
    onEdit?: () => void;
}

export function WidgetButton({ widget, status = "online", onRemove, onEdit }: WidgetButtonProps) {
    const { t } = useTranslation();
    const execute = useExecuteButtonApiWidgetsWidgetIdExecutePost({
        mutation: { meta: { skipGlobalErrorToast: true } },
    });
    const [confirmOpen, setConfirmOpen] = useState(false);

    const actionName = widget.action_name
        ? t(`knownActions.${widget.action_name.replaceAll(" ", "_")}`, widget.action_name)
        : undefined;
    const label = widget.name || actionName || t("dashboard.button");

    function doExecute() {
        execute.mutate(
            { widgetId: widget.id, data: {} },
            {
                onSettled: () => setConfirmOpen(false),
                onSuccess: () => actionName && toast.success(boldName(t, "toast.actionExecuted", actionName)),
                onError: () => toast.error(boldName(t, "toast.actionFailed", actionName ?? "")),
            },
        );
    }

    function handleClick() {
        if (widget.confirm_actions) {
            setConfirmOpen(true);
        } else {
            doExecute();
        }
    }

    return (
        <Card
            className={`relative overflow-hidden group py-0 h-full transition-all duration-300 select-none cursor-pointer hover:shadow-lg hover:border-primary/30${
                status === "offline"
                    ? " opacity-40 grayscale cursor-default"
                    : status === "warning"
                      ? " opacity-70"
                      : ""
            }`}
            onClick={() => status === "online" && handleClick()}
        >
            {status === "warning" ? (
                <div className="absolute inset-y-0 left-0 w-1 bg-warning" />
            ) : (
                <div className="absolute inset-y-0 left-0 w-1 bg-primary/70" />
            )}

            <CardContent className="p-3 pl-4 sm:p-4 sm:pl-5 h-full flex items-center gap-3">
                {widget.icon ? (
                    <SafeIcon name={widget.icon} className="h-5 w-5 text-primary shrink-0" />
                ) : (
                    <Play className="h-5 w-5 text-primary shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{label}</p>
                    {widget.handler_label && (
                        <p className="text-[11px] text-muted-foreground truncate">{widget.handler_label}</p>
                    )}
                </div>
            </CardContent>

            {(onEdit || onRemove) && (
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
            )}

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                onConfirm={doExecute}
                description={t("confirm.executeAction", {
                    action: actionName ?? "",
                    device: widget.handler_label ?? "",
                })}
            />
        </Card>
    );
}

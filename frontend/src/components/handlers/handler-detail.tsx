import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Play, Plus, Square, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useExecuteActionApiActionsActionIdExecutePost } from "@/api/generated/actions/actions";
import {
    getListAttributesApiAttributesGetQueryKey,
    useCreateAttributeApiAttributesPost,
    useListAttributesApiAttributesGet,
    useReorderAttributesApiAttributesReorderPut,
} from "@/api/generated/attributes/attributes";
import type {
    ActionRead,
    AttributeRead,
    HandlerRead,
    HandlerStatus,
} from "@/api/generated/contWatchAPI.schemas";
import {
    useAvailableAttributesApiHandlersHandlerIdAvailableAttributesGet,
    useDeleteHandlerApiHandlersHandlerIdDelete,
    useHandlerStatusApiHandlersHandlerIdStatusGet,
    useStartHandlerApiHandlersHandlerIdStartPost,
    useStopHandlerApiHandlersHandlerIdStopPost,
} from "@/api/generated/handlers/handlers";
import { StatusIndicator } from "@/components/layout/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { useLiveValuesStore } from "@/stores/live-values";
import { ActionEditDialog } from "./action-edit-dialog";
import { formatActionMessage } from "./action-utils";
import { AddActionDialog } from "./add-action-dialog";
import { AttributeEditDialog } from "./attribute-edit-dialog";
import { HandlerConfigEditDialog } from "./handler-config-edit-dialog";
import { SortableAttributeList } from "./sortable-attribute-list";

interface HandlerDetailProps {
    handler: HandlerRead | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function HandlerDetail({ handler, open, onOpenChange }: HandlerDetailProps) {
    const { t } = useTranslation();
    const [editConfigHandler, setEditConfigHandler] = useState<HandlerRead | null>(null);

    if (!handler) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl">
                <SheetHeader>
                    <SheetTitle>{t("handlers.details")}</SheetTitle>
                </SheetHeader>
                <div className="flex-1 flex flex-col min-h-0 gap-6 px-4 pb-4">
                    <HandlerInfo
                        handler={handler}
                        onEditConfig={() => setEditConfigHandler(handler)}
                        onClose={() => onOpenChange(false)}
                    />
                    <Separator />
                    <HandlerActions handler={handler} />
                    <Separator />
                    <RegisteredAttributes handler={handler} />
                    <AvailableAttributes handler={handler} />
                </div>
            </SheetContent>
            <HandlerConfigEditDialog handler={editConfigHandler} onClose={() => setEditConfigHandler(null)} />
        </Sheet>
    );
}

function HandlerInfo({
    handler,
    onEditConfig,
    onClose,
}: {
    handler: HandlerRead;
    onEditConfig: () => void;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const { data: statusData } = useHandlerStatusApiHandlersHandlerIdStatusGet(handler.id, {
        query: { refetchInterval: 5000 },
    });
    const startHandler = useStartHandlerApiHandlersHandlerIdStartPost();
    const stopHandler = useStopHandlerApiHandlersHandlerIdStopPost();
    const deleteHandler = useDeleteHandlerApiHandlersHandlerIdDelete();
    const status = statusData?.data as HandlerStatus | undefined;

    const isRunning = status?.running ?? false;
    const isConnected = status?.connected ?? false;
    const statusVariant = isRunning && isConnected ? "online" : isRunning ? "warning" : "offline";

    const label = handler.label || handler.type;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <StatusIndicator variant={statusVariant} size="md" />
                    <div>
                        <p className="text-sm font-medium">{label}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="secondary" className="text-[10px] font-mono">
                                {handler.type}
                            </Badge>
                            {isRunning && (
                                <Badge variant={isConnected ? "default" : "outline"} className="text-[10px]">
                                    {isConnected ? t("handlers.connected") : t("handlers.disconnected")}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onEditConfig}
                        title={t("handlers.editConfig")}
                    >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        {t("handlers.configure")}
                    </Button>
                    {isRunning ? (
                        <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() =>
                                stopHandler.mutate(
                                    { handlerId: handler.id },
                                    { onSuccess: () => toast.success(t("toast.handlerStopped")) },
                                )
                            }
                            disabled={stopHandler.isPending}
                            title={t("handlers.stop")}
                        >
                            <Square className="h-3.5 w-3.5" />
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() =>
                                startHandler.mutate(
                                    { handlerId: handler.id },
                                    { onSuccess: () => toast.success(t("toast.handlerStarted")) },
                                )
                            }
                            disabled={startHandler.isPending}
                            title={t("handlers.start")}
                        >
                            <Play className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() =>
                            deleteHandler.mutate(
                                { handlerId: handler.id },
                                {
                                    onSuccess: () => {
                                        toast.success(t("toast.handlerDeleted"));
                                        onClose();
                                    },
                                },
                            )
                        }
                        disabled={deleteHandler.isPending}
                        className="text-muted-foreground hover:text-destructive-foreground"
                        title={t("common.delete")}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function RegisteredAttributes({ handler }: { handler: HandlerRead }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const params = { handler_id: handler.id };
    const { data: attrsData } = useListAttributesApiAttributesGet(params);
    const reorder = useReorderAttributesApiAttributesReorderPut();
    const values = useLiveValuesStore((s) => s.values);
    const attrs = (attrsData?.data ?? []) as AttributeRead[];
    const [editingAttribute, setEditingAttribute] = useState<AttributeRead | null>(null);

    function handleReorder(reordered: AttributeRead[]) {
        const items = reordered.map((a, i) => ({ id: a.id, order: i }));
        const queryKey = getListAttributesApiAttributesGetQueryKey(params);

        queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData(queryKey, (old: unknown) => {
            if (!old || typeof old !== "object" || !("data" in old)) return old;
            return { ...old, data: reordered.map((a, i) => ({ ...a, order: i })) };
        });

        reorder.mutate({ data: { items } });
    }

    return (
        <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
                {t("handlers.registeredAttributes")}
            </h4>
            {attrs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("common.noData")}</p>
            ) : (
                <div className="space-y-2">
                    <SortableAttributeList
                        items={attrs}
                        onReorder={handleReorder}
                        onLongPress={(attr) => setEditingAttribute(attr)}
                        renderItem={(attr) => (
                            <DetailAttributeRow
                                attr={attr}
                                liveVal={values[attr.id]}
                                onEdit={() => setEditingAttribute(attr)}
                            />
                        )}
                    />
                </div>
            )}
            <AttributeEditDialog attribute={editingAttribute} onClose={() => setEditingAttribute(null)} />
        </div>
    );
}

function DetailAttributeRow({
    attr,
    liveVal,
    onEdit,
}: {
    attr: AttributeRead;
    liveVal: { value: unknown } | undefined;
    onEdit: () => void;
}) {
    const { t } = useTranslation();
    const displayValue =
        liveVal?.value != null
            ? attr.rounding != null
                ? Number(liveVal.value as number).toFixed(attr.rounding)
                : String(liveVal.value)
            : "-";

    return (
        <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 cursor-grab">
            <div className="min-w-0 flex-1">
                <p className="font-mono text-xs truncate">{attr.name}</p>
                {attr.label && <p className="text-xs text-muted-foreground truncate">{attr.label}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className="data-value text-sm font-medium tabular-nums">{displayValue}</span>
                {attr.unit && <span className="text-xs text-muted-foreground">{attr.unit}</span>}
                <Button variant="ghost" size="icon-xs" onClick={onEdit} title={t("handlers.editAttribute")}>
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
            </div>
        </div>
    );
}

function AvailableAttributes({ handler }: { handler: HandlerRead }) {
    const { t } = useTranslation();
    const { data: availData } = useAvailableAttributesApiHandlersHandlerIdAvailableAttributesGet(handler.id, {
        query: { refetchInterval: 5000 },
    });
    const createAttribute = useCreateAttributeApiAttributesPost();

    const available = (availData?.data ?? []) as string[];

    function handleAdd(name: string) {
        createAttribute.mutate(
            { data: { name, handler_id: handler.id, enabled: true } },
            { onSuccess: () => toast.success(t("toast.attributeAdded")) },
        );
    }

    if (available.length === 0) return null;

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            <Separator className="mb-6" />
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3 shrink-0">
                {t("handlers.availableAttributes")}
            </h4>
            <div className="space-y-1 flex-1 min-h-0 overflow-y-auto">
                {available.map((name) => (
                    <div
                        key={name}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-accent transition-colors"
                    >
                        <span className="font-mono text-xs">{name}</span>
                        <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleAdd(name)}
                            disabled={createAttribute.isPending}
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            {t("common.add")}
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function HandlerActions({ handler }: { handler: HandlerRead }) {
    const { t } = useTranslation();
    const actions = (handler.actions ?? []) as ActionRead[];
    const [editingAction, setEditingAction] = useState<ActionRead | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const executeAction = useExecuteActionApiActionsActionIdExecutePost();

    function handleExecute(action: ActionRead) {
        executeAction.mutate(
            { actionId: action.id },
            {
                onSuccess: () => toast.success(t("toast.actionExecuted", { name: action.name })),
                onError: () => toast.error(t("toast.actionFailed", { name: action.name })),
            },
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    {t("handlers.actions")}
                </h4>
                <Button size="xs" variant="outline" onClick={() => setAddOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" />
                    {t("common.add")}
                </Button>
            </div>
            {actions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("handlers.noActions")}</p>
            ) : (
                <div className="space-y-2">
                    {actions.map((action) => (
                        <div key={action.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleExecute(action)}
                                disabled={executeAction.isPending}
                                title={t("handlers.executeAction")}
                                className="shrink-0 text-primary hover:text-primary"
                            >
                                <Play className="h-3.5 w-3.5" />
                            </Button>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{action.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {formatActionMessage(action.message)}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => setEditingAction(action)}
                                title={t("handlers.editAction")}
                                className="shrink-0"
                            >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
            <ActionEditDialog action={editingAction} onClose={() => setEditingAction(null)} />
            <AddActionDialog handler={handler} open={addOpen} onOpenChange={setAddOpen} />
        </div>
    );
}

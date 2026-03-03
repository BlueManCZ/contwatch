import { useQueryClient } from "@tanstack/react-query";
import type { Locale } from "date-fns";
import { formatDistanceToNow } from "date-fns";
import { cs, enUS } from "date-fns/locale";
import { Cable, ChevronDown, Pencil, Play, Plus, Square, Trash2 } from "lucide-react";
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
    ActionParamInfo,
    ActionRead,
    AttributeRead,
    HandlerRead,
    HandlerStatus,
    HandlerTypeInfo,
    KnownActionInfo,
    ResolvedControl,
} from "@/api/generated/contWatchAPI.schemas";
import {
    useAvailableAttributesApiHandlersHandlerIdAvailableAttributesGet,
    useDeleteHandlerApiHandlersHandlerIdDelete,
    useHandlerControlsApiHandlersHandlerIdControlsGet,
    useHandlerStatusApiHandlersHandlerIdStatusGet,
    useListHandlerTypesApiHandlersTypesGet,
    useStartHandlerApiHandlersHandlerIdStartPost,
    useStopHandlerApiHandlersHandlerIdStopPost,
} from "@/api/generated/handlers/handlers";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SafeIcon } from "@/components/safe-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatValue } from "@/lib/format-value";
import { cn } from "@/lib/utils";
import { useLiveValuesStore } from "@/stores/live-values";
import { ActionEditDialog } from "./action-edit-dialog";
import { ActionParamPopover } from "./action-param-dialog";
import { formatActionMessage } from "./action-utils";
import { AddActionDialog } from "./add-action-dialog";
import { AttributeEditDialog } from "./attribute-edit-dialog";
import { HandlerConfigEditDialog } from "./handler-config-edit-dialog";
import { HandlerControls } from "./handler-controls";
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
                <div className="flex-1 min-h-0 overflow-y-auto space-y-6 px-4 pb-4">
                    <HandlerInfo
                        handler={handler}
                        onEditConfig={() => setEditConfigHandler(handler)}
                        onClose={() => onOpenChange(false)}
                    />
                    <Separator />
                    <HandlerControlsAndActions handler={handler} />
                    <Separator />
                    <RegisteredAttributes handler={handler} />
                    <AvailableAttributes handler={handler} />
                </div>
            </SheetContent>
            <HandlerConfigEditDialog handler={editConfigHandler} onClose={() => setEditConfigHandler(null)} />
        </Sheet>
    );
}

const dateFnsLocales: Record<string, Locale> = { en: enUS, cs };

function HandlerInfo({
    handler,
    onEditConfig,
    onClose,
}: {
    handler: HandlerRead;
    onEditConfig: () => void;
    onClose: () => void;
}) {
    const { t, i18n } = useTranslation();
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const { data: statusData } = useHandlerStatusApiHandlersHandlerIdStatusGet(handler.id, {
        query: { refetchInterval: 5000 },
    });
    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();
    const startHandler = useStartHandlerApiHandlersHandlerIdStartPost();
    const stopHandler = useStopHandlerApiHandlersHandlerIdStopPost();
    const deleteHandler = useDeleteHandlerApiHandlersHandlerIdDelete();
    const status = statusData?.data as HandlerStatus | undefined;

    const isRunning = status?.running ?? false;
    const isConnected = status?.connected ?? false;

    const label = handler.label || handler.type;
    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];
    const icon = handlerTypes.find((ht) => ht.type === handler.type)?.icon;

    const statusColor =
        isRunning && isConnected ? "text-success" : isRunning ? "text-warning" : "text-muted-foreground/50";
    const aura =
        isRunning && isConnected
            ? { bg: "bg-success", anim: "animate-breathe opacity-15" }
            : isRunning
              ? { bg: "bg-warning", anim: "animate-ping-slow opacity-30" }
              : undefined;

    const lastActiveText = status?.last_active
        ? formatDistanceToNow(new Date(status.last_active), {
              addSuffix: true,
              locale: dateFnsLocales[i18n.language],
          })
        : null;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3">
                <span className="relative flex shrink-0 h-6 w-6 items-center justify-center">
                    {aura && (
                        <span className={cn("absolute h-full w-full rounded-full", aura.bg, aura.anim)} />
                    )}
                    <SafeIcon
                        name={icon}
                        className={cn("relative h-6 w-6", statusColor)}
                        fallback={<Cable className={cn("relative h-6 w-6", statusColor)} />}
                    />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{label}</p>
                        {isRunning && !isConnected && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {t("handlers.disconnected")}
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {handler.description}
                        {isRunning && !isConnected && lastActiveText && (
                            <>
                                <span className="mx-1.5 opacity-40">&#183;</span>
                                {lastActiveText}
                            </>
                        )}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="flex-1" onClick={onEditConfig}>
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
                    onClick={() => setConfirmDeleteOpen(true)}
                    disabled={deleteHandler.isPending}
                    className="text-muted-foreground hover:text-destructive-foreground"
                    title={t("common.delete")}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
            <ConfirmDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                onConfirm={() =>
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
                description={t("confirm.deleteHandler")}
            />
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
    const { t, i18n } = useTranslation();
    const i18nKey = `knownAttributes.${attr.name.replace(/[/:]/g, "_")}`;
    const englishDefault = i18n.exists(i18nKey) ? String(i18n.t(i18nKey, { lng: "en" })) : null;
    const localizedLabel = attr.label
        ? attr.label === englishDefault
            ? String(t(i18nKey))
            : attr.label
        : undefined;

    const raw = liveVal?.value;
    const formatted =
        raw != null && typeof raw === "number" && attr.unit
            ? formatValue(raw, attr.unit, attr.rounding)
            : null;
    const displayValue = raw != null ? (formatted?.value ?? String(raw)) : "-";
    const displayUnit = formatted?.unit ?? attr.unit;

    return (
        <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 cursor-grab">
            <div className="min-w-0 flex-1">
                <p className="text-xs truncate">{localizedLabel || attr.name}</p>
                {localizedLabel && (
                    <p className="font-mono text-xs text-muted-foreground truncate">{attr.name}</p>
                )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className="data-value text-sm font-medium tabular-nums">{displayValue}</span>
                {displayUnit && <span className="text-xs text-muted-foreground">{displayUnit}</span>}
                <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onEdit}
                    title={t("handlers.editAttribute")}
                    className="cursor-pointer hover:bg-accent"
                >
                    <Pencil className="h-3 w-3 text-muted-foreground group-hover/button:text-foreground" />
                </Button>
            </div>
        </div>
    );
}

function AvailableAttributes({ handler }: { handler: HandlerRead }) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { data: availData } = useAvailableAttributesApiHandlersHandlerIdAvailableAttributesGet(handler.id, {
        query: { refetchInterval: 5000 },
    });
    const createAttribute = useCreateAttributeApiAttributesPost();

    const available = (availData?.data ?? []) as string[];

    function handleAdd(name: string) {
        createAttribute.mutate(
            { data: { name, handler_id: handler.id, enabled: true } },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: getListAttributesApiAttributesGetQueryKey() });
                    toast.success(t("toast.attributeAdded"));
                },
            },
        );
    }

    if (available.length === 0) return null;

    return (
        <div>
            <Separator className="mb-6" />
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
                {t("handlers.availableAttributes")}
            </h4>
            <div className="space-y-1">
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

function HandlerControlsAndActions({ handler }: { handler: HandlerRead }) {
    const { t } = useTranslation();
    const { data: controlsData } = useHandlerControlsApiHandlersHandlerIdControlsGet(handler.id, {
        query: { refetchInterval: 5000 },
    });
    const controls = (controlsData?.data ?? []) as ResolvedControl[];
    const hasControls = controls.length > 0;

    if (!hasControls) {
        return <HandlerActions handler={handler} />;
    }

    return (
        <div className="space-y-4">
            <HandlerControls handler={handler} />
            <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-foreground transition-colors group">
                    <ChevronDown className="h-3 w-3 transition-transform group-data-[panel-open]:rotate-180" />
                    {t("handlers.allActions")}
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="pt-3">
                        <HandlerActions handler={handler} />
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

function HandlerActions({ handler }: { handler: HandlerRead }) {
    const { t } = useTranslation();
    const actions = (handler.actions ?? []) as ActionRead[];
    const [editingAction, setEditingAction] = useState<ActionRead | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const executeAction = useExecuteActionApiActionsActionIdExecutePost();
    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();
    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];

    function getKnownActionParams(actionName: string): ActionParamInfo[] | undefined {
        const ht = handlerTypes.find((h) => h.type === handler.type);
        if (!ht) return undefined;
        const ka = (ht.known_actions ?? []).find((a: KnownActionInfo) => a.name === actionName);
        return ka?.params && ka.params.length > 0 ? ka.params : undefined;
    }

    function handleExecute(action: ActionRead) {
        executeAction.mutate(
            { actionId: action.id, data: null },
            {
                onSuccess: () =>
                    toast.success(
                        t("toast.actionExecuted", {
                            name: t(`knownActions.${action.name.replaceAll(" ", "_")}`, action.name),
                        }),
                    ),
                onError: () =>
                    toast.error(
                        t("toast.actionFailed", {
                            name: t(`knownActions.${action.name.replaceAll(" ", "_")}`, action.name),
                        }),
                    ),
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
                        <ActionCard
                            key={action.id}
                            action={action}
                            handler={handler}
                            params={getKnownActionParams(action.name)}
                            onExecute={handleExecute}
                            isPending={executeAction.isPending}
                            onEdit={() => setEditingAction(action)}
                        />
                    ))}
                </div>
            )}
            <ActionEditDialog action={editingAction} onClose={() => setEditingAction(null)} />
            <AddActionDialog handler={handler} open={addOpen} onOpenChange={setAddOpen} />
        </div>
    );
}

function ActionCard({
    action,
    handler,
    params,
    onExecute,
    isPending,
    onEdit,
}: {
    action: ActionRead;
    handler: HandlerRead;
    params: ActionParamInfo[] | undefined;
    onExecute: (action: ActionRead) => void;
    isPending: boolean;
    onEdit: () => void;
}) {
    const { t } = useTranslation();

    const card = (
        <div className="flex items-center rounded-md border transition-colors hover:bg-accent/50">
            <button
                type="button"
                className="flex flex-1 items-center gap-2 px-3 py-2 text-left cursor-pointer disabled:opacity-50 disabled:cursor-default"
                onClick={params ? undefined : () => onExecute(action)}
                disabled={isPending}
            >
                <Play className="h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                        {t(`knownActions.${action.name.replaceAll(" ", "_")}`, action.name)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                        {formatActionMessage(action.message)}
                    </p>
                </div>
            </button>
            <Button
                variant="ghost"
                size="icon-xs"
                onClick={onEdit}
                title={t("handlers.editAction")}
                className="shrink-0 mr-2 cursor-pointer hover:bg-accent"
            >
                <Pencil className="h-3 w-3 text-muted-foreground group-hover/button:text-foreground" />
            </Button>
        </div>
    );

    if (params) {
        return (
            <ActionParamPopover action={action} params={params} handler={handler}>
                {card}
            </ActionParamPopover>
        );
    }

    return card;
}

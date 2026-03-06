import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Cable, ChevronDown, Pencil, Play, Plus, Square, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
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
    HandlerTypeInfo,
    KnownActionInfo,
    ResolvedControl,
} from "@/api/generated/contWatchAPI.schemas";
import {
    useAvailableAttributesApiHandlersHandlerIdAvailableAttributesGet,
    useDeleteHandlerApiHandlersHandlerIdDelete,
    useHandlerControlsApiHandlersHandlerIdControlsGet,
    useListHandlerTypesApiHandlersTypesGet,
    useStartHandlerApiHandlersHandlerIdStartPost,
    useStopHandlerApiHandlersHandlerIdStopPost,
} from "@/api/generated/handlers/handlers";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SafeIcon } from "@/components/safe-icon";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { dateFnsLocales } from "@/lib/date-locale";
import { formatValue } from "@/lib/format-value";
import { localizeAttributeLabel } from "@/lib/localize-attribute";
import { boldName, cn } from "@/lib/utils";
import { INDICATOR_COLOR, useHandlerIndicatorStore } from "@/stores/handler-indicators";
import { useHandlerStatusStore } from "@/stores/handler-status";
import { useLiveValuesStore } from "@/stores/live-values";
import { ActionEditDialog } from "./action-edit-dialog";
import { ActionParamPopover } from "./action-param-dialog";
import { formatActionMessage } from "./action-utils";
import { AddActionDialog } from "./add-action-dialog";
import { AttributeEditDialog } from "./attribute-edit-dialog";
import { HandlerConfigEditDialog } from "./handler-config-edit-dialog";
import { HandlerControls } from "./handler-controls";
import { SortableList } from "./sortable-list";

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
    return (
        <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest">
                {title}
            </h4>
            {action}
        </div>
    );
}

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
                <SheetHeader className="pb-0">
                    <SheetTitle className="leading-8">{t("handlers.details")}</SheetTitle>
                </SheetHeader>
                <div className="flex-1 min-h-0 overflow-y-auto space-y-5 px-4 pb-4">
                    <HandlerInfo
                        handler={handler}
                        onEditConfig={() => setEditConfigHandler(handler)}
                        onClose={() => onOpenChange(false)}
                    />
                    <HandlerControlsAndActions handler={handler} />
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
    const { t, i18n } = useTranslation();
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const status = useHandlerStatusStore((s) => s.statuses[handler.id]);
    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();
    const startHandler = useStartHandlerApiHandlersHandlerIdStartPost();
    const stopHandler = useStopHandlerApiHandlersHandlerIdStopPost();
    const deleteHandler = useDeleteHandlerApiHandlersHandlerIdDelete();

    const isRunning = status?.running ?? false;
    const isConnected = status?.connected ?? false;

    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];
    const typeInfo = handlerTypes.find((ht) => ht.type === handler.type);
    const label = handler.label || typeInfo?.name || handler.type;
    const icon = typeInfo?.icon;

    const statusColor =
        isRunning && isConnected ? "text-success" : isRunning ? "text-warning" : "text-muted-foreground/50";
    const aura =
        isRunning && isConnected
            ? { bg: "bg-success", anim: "animate-breathe opacity-15" }
            : isRunning
              ? { bg: "bg-warning", anim: "animate-ping-slow opacity-30" }
              : undefined;

    const statusDotColor =
        isRunning && isConnected ? "bg-success" : isRunning ? "bg-warning" : "bg-muted-foreground/40";
    const statusLabel = !isRunning
        ? t("handlers.stopped")
        : isConnected
          ? t("handlers.connected")
          : t("handlers.disconnected");

    const indicators = useHandlerIndicatorStore((s) => s.indicators[handler.id]);

    const lastActiveText = status?.last_active
        ? formatDistanceToNow(new Date(status.last_active), {
              addSuffix: true,
              locale: dateFnsLocales[i18n.language],
          })
        : null;

    return (
        <div>
            {/* ── Identity card ── */}
            <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/50">
                <div className="p-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="relative flex shrink-0 h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/50">
                            {aura && (
                                <span
                                    className={cn(
                                        "absolute inset-0 m-auto h-5 w-5 rounded-full",
                                        aura.bg,
                                        aura.anim,
                                    )}
                                />
                            )}
                            <SafeIcon
                                name={icon}
                                className={cn("relative h-5 w-5", statusColor)}
                                fallback={<Cable className={cn("relative h-5 w-5", statusColor)} />}
                            />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate leading-tight">{label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 data-value truncate">
                                {handler.description}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2.5 ml-12 text-[11px]">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusDotColor)} />
                            {statusLabel}
                        </span>
                        {isRunning && !isConnected && lastActiveText && (
                            <span className="text-muted-foreground/60">{lastActiveText}</span>
                        )}
                    </div>

                    {/* ── Indicators ── */}
                    {isRunning && indicators && indicators.length > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border/40">
                            {indicators.map((ind) => (
                                <span key={ind.icon} className="inline-flex items-center gap-1.5 text-[11px]">
                                    <SafeIcon
                                        name={ind.icon}
                                        className={cn("h-3 w-3 shrink-0", INDICATOR_COLOR[ind.color])}
                                    />
                                    <span className={INDICATOR_COLOR[ind.color]}>
                                        {t(ind.tooltip_key, ind.tooltip_params ?? {})}
                                    </span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Toolbar ── */}
                <div className="flex items-center gap-px border-t border-border/40 bg-background/30">
                    <button
                        type="button"
                        className="flex flex-1 items-center justify-center gap-1.5 py-3 sm:py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={onEditConfig}
                        title={t("handlers.configure")}
                    >
                        <Pencil className="h-4.5 w-4.5 sm:h-3 sm:w-3" />
                        <span className="hidden sm:inline">{t("handlers.configure")}</span>
                    </button>
                    <span className="w-px h-4 bg-border/40" />
                    {isRunning ? (
                        <button
                            type="button"
                            className="flex flex-1 items-center justify-center gap-1.5 py-3 sm:py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
                            onClick={() =>
                                stopHandler.mutate(
                                    { handlerId: handler.id },
                                    { onSuccess: () => toast.success(t("toast.handlerStopped")) },
                                )
                            }
                            disabled={stopHandler.isPending}
                            title={t("handlers.stop")}
                        >
                            <Square className="h-4.5 w-4.5 sm:h-3 sm:w-3" />
                            <span className="hidden sm:inline">{t("handlers.stop")}</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="flex flex-1 items-center justify-center gap-1.5 py-3 sm:py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
                            onClick={() =>
                                startHandler.mutate(
                                    { handlerId: handler.id },
                                    { onSuccess: () => toast.success(t("toast.handlerStarted")) },
                                )
                            }
                            disabled={startHandler.isPending}
                            title={t("handlers.start")}
                        >
                            <Play className="h-4.5 w-4.5 sm:h-3 sm:w-3" />
                            <span className="hidden sm:inline">{t("handlers.start")}</span>
                        </button>
                    )}
                    <span className="w-px h-4 bg-border/40" />
                    <button
                        type="button"
                        className="flex flex-1 items-center justify-center gap-1.5 py-3 sm:py-2 text-xs text-muted-foreground hover:text-destructive-foreground hover:bg-destructive/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
                        onClick={() => setConfirmDeleteOpen(true)}
                        disabled={deleteHandler.isPending}
                        title={t("common.delete")}
                    >
                        <Trash2 className="h-4.5 w-4.5 sm:h-3 sm:w-3" />
                        <span className="hidden sm:inline">{t("common.delete")}</span>
                    </button>
                </div>
            </div>
            <ConfirmDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                variant="destructive"
                confirmLabel={t("common.delete")}
                isPending={deleteHandler.isPending}
                onConfirm={() =>
                    deleteHandler.mutate(
                        { handlerId: handler.id },
                        {
                            onSuccess: () => {
                                setConfirmDeleteOpen(false);
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
            <SectionHeader title={t("handlers.registeredAttributes")} />
            {attrs.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-border/60 py-4">
                    <p className="text-xs text-muted-foreground/50">{t("common.noData")}</p>
                </div>
            ) : (
                <div className="rounded-xl border border-border overflow-hidden [&>[role=button]+[role=button]]:border-t [&>[role=button]+[role=button]]:border-border/60">
                    <SortableList
                        items={attrs}
                        onReorder={handleReorder}
                        onItemClick={(attr) => setEditingAttribute(attr)}
                        renderItem={(attr) => <DetailAttributeRow attr={attr} liveVal={values[attr.id]} />}
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
}: {
    attr: AttributeRead;
    liveVal: { value: unknown } | undefined;
}) {
    const { t, i18n } = useTranslation();
    const localizedLabel = localizeAttributeLabel(attr.name, attr.label, t, i18n);

    const raw = liveVal?.value;
    const formatted =
        raw != null && typeof raw === "number" && attr.unit
            ? formatValue(raw, attr.unit, attr.rounding)
            : null;
    const displayValue = raw != null ? (formatted?.value ?? String(raw)) : "-";
    const displayUnit = formatted?.unit ?? attr.unit;

    return (
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent/30 transition-colors">
            <div className="min-w-0 flex-1">
                <p className="text-xs truncate">{localizedLabel}</p>
                {localizedLabel !== attr.name && (
                    <p className="font-mono text-xs text-muted-foreground/60 truncate">{attr.name}</p>
                )}
            </div>
            <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="data-value text-sm font-semibold">{displayValue}</span>
                {displayUnit && <span className="text-xs text-muted-foreground/70">{displayUnit}</span>}
            </div>
        </div>
    );
}

function AvailableAttributes({ handler }: { handler: HandlerRead }) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const { data: availData } = useAvailableAttributesApiHandlersHandlerIdAvailableAttributesGet(handler.id, {
        query: { refetchInterval: 5000 },
    });
    const createAttribute = useCreateAttributeApiAttributesPost();
    const [confirmName, setConfirmName] = useState<string | null>(null);

    const raw = availData?.data;
    const items = Array.isArray(raw) ? raw : [];

    function handleAdd(name: string) {
        createAttribute.mutate(
            { data: { name, handler_id: handler.id, enabled: true } },
            {
                onSuccess: () => {
                    setConfirmName(null);
                    queryClient.invalidateQueries({ queryKey: getListAttributesApiAttributesGetQueryKey() });
                    toast.success(t("toast.attributeAdded"));
                },
            },
        );
    }

    if (items.length === 0) return null;

    const confirmItem = items.find((i) => i.name === confirmName);
    const confirmLabel = confirmItem
        ? localizeAttributeLabel(confirmItem.name, confirmItem.label, t, i18n)
        : "";

    return (
        <div>
            <SectionHeader title={t("handlers.availableAttributes")} />
            <div className="rounded-xl border border-dashed border-border overflow-hidden divide-y divide-border/60">
                {items.map((item) => {
                    const displayLabel = localizeAttributeLabel(item.name, item.label, t, i18n);
                    const isLocalized = displayLabel !== item.name;
                    return (
                        <button
                            type="button"
                            key={item.name}
                            className="flex w-full items-center justify-between gap-3 py-2.5 px-3 hover:bg-accent/30 transition-colors cursor-pointer text-left"
                            onClick={() => setConfirmName(item.name)}
                        >
                            <div className="min-w-0 flex-1">
                                <p className="text-xs truncate">{displayLabel}</p>
                                {isLocalized && (
                                    <p className="font-mono text-xs text-muted-foreground/60 truncate">
                                        {item.name}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-baseline gap-1.5 shrink-0">
                                <span className="data-value text-sm font-semibold">
                                    {item.value != null ? String(item.value) : "-"}
                                </span>
                                {item.unit && (
                                    <span className="text-xs text-muted-foreground/70">{item.unit}</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
            <ConfirmDialog
                open={confirmName !== null}
                onOpenChange={(open) => !open && setConfirmName(null)}
                onConfirm={() => confirmName && handleAdd(confirmName)}
                title={t("confirm.registerAttributeTitle")}
                description={t("confirm.registerAttribute", { name: confirmLabel })}
                confirmLabel={t("common.add")}
                isPending={createAttribute.isPending}
            />
        </div>
    );
}

function HandlerControlsAndActions({ handler }: { handler: HandlerRead }) {
    const { t } = useTranslation();
    const [addOpen, setAddOpen] = useState(false);
    const [actionsExpanded, setActionsExpanded] = useState(false);
    const { data: controlsData } = useHandlerControlsApiHandlersHandlerIdControlsGet(handler.id, {
        query: { refetchInterval: 5000 },
    });
    const controls = (controlsData?.data ?? []) as ResolvedControl[];
    const hasControls = controls.length > 0;

    const addButton = (
        <Button
            size="xs"
            variant="ghost"
            className="text-muted-foreground/70 hover:text-foreground cursor-pointer -my-1"
            onClick={() => setAddOpen(true)}
        >
            <Plus className="h-3.5 w-3.5" />
            {t("common.add")}
        </Button>
    );

    if (!hasControls) {
        return (
            <>
                <HandlerActions handler={handler} addButton={addButton} />
                <AddActionDialog handler={handler} open={addOpen} onOpenChange={setAddOpen} />
            </>
        );
    }

    return (
        <div className="space-y-4">
            <HandlerControls handler={handler} />
            <Collapsible onOpenChange={setActionsExpanded}>
                <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70 uppercase tracking-widest cursor-pointer hover:text-foreground transition-colors group">
                        <ChevronDown className="h-3 w-3 transition-transform group-data-[panel-open]:rotate-180" />
                        {t("handlers.allActions")}
                    </CollapsibleTrigger>
                    {actionsExpanded && addButton}
                </div>
                <CollapsibleContent>
                    <div className="pt-2">
                        <HandlerActions handler={handler} showHeader={false} addButton={null} />
                    </div>
                </CollapsibleContent>
            </Collapsible>
            <AddActionDialog handler={handler} open={addOpen} onOpenChange={setAddOpen} />
        </div>
    );
}

function HandlerActions({
    handler,
    showHeader = true,
    addButton,
}: {
    handler: HandlerRead;
    showHeader?: boolean;
    addButton: ReactNode;
}) {
    const { t } = useTranslation();
    const actions = (handler.actions ?? []) as ActionRead[];
    const [editingAction, setEditingAction] = useState<ActionRead | null>(null);
    const [pendingAction, setPendingAction] = useState<ActionRead | null>(null);
    const executeAction = useExecuteActionApiActionsActionIdExecutePost({
        mutation: { meta: { skipGlobalErrorToast: true } },
    });
    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();
    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];

    function getKnownActionParams(actionName: string): ActionParamInfo[] | undefined {
        const ht = handlerTypes.find((h) => h.type === handler.type);
        if (!ht) return undefined;
        const ka = (ht.known_actions ?? []).find((a: KnownActionInfo) => a.name === actionName);
        return ka?.params && ka.params.length > 0 ? ka.params : undefined;
    }

    function doExecute(action: ActionRead) {
        const name = t(`knownActions.${action.name.replaceAll(" ", "_")}`, action.name);
        executeAction.mutate(
            { actionId: action.id, data: null },
            {
                onSettled: () => setPendingAction(null),
                onSuccess: () => toast.success(boldName(t, "toast.actionExecuted", name)),
                onError: () => toast.error(boldName(t, "toast.actionFailed", name)),
            },
        );
    }

    function handleExecute(action: ActionRead) {
        if (handler.confirm_actions) {
            setPendingAction(action);
        } else {
            doExecute(action);
        }
    }

    return (
        <div>
            {showHeader && <SectionHeader title={t("handlers.actions")} action={addButton} />}
            {actions.length === 0 ? (
                <div className="flex items-center justify-center rounded-lg border border-dashed border-border/60 py-4">
                    <p className="text-xs text-muted-foreground/50">{t("handlers.noActions")}</p>
                </div>
            ) : (
                <div className="space-y-1.5">
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
            <ConfirmDialog
                open={pendingAction !== null}
                onOpenChange={(open) => !open && setPendingAction(null)}
                onConfirm={() => {
                    if (pendingAction) doExecute(pendingAction);
                }}
                description={t("confirm.executeAction", {
                    action: pendingAction
                        ? t(`knownActions.${pendingAction.name.replaceAll(" ", "_")}`, pendingAction.name)
                        : "",
                    device: handler.label || handler.description || handler.type,
                })}
            />
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

    const executeButton = (
        <Button
            variant="ghost"
            size="icon"
            className="shrink-0 cursor-pointer bg-primary/10 hover:bg-primary/20"
            onClick={(e) => {
                e.stopPropagation();
                if (!params) onExecute(action);
            }}
            disabled={isPending}
            title={t(`knownActions.${action.name.replaceAll(" ", "_")}`, action.name)}
        >
            <Play className="h-3.5 w-3.5 text-primary" />
        </Button>
    );

    const card = (
        // biome-ignore lint/a11y/useSemanticElements: row acts as both drag handle and edit trigger
        <div
            className="flex items-center gap-2.5 rounded-lg border border-border px-2 py-1.5 transition-colors hover:bg-accent/30 cursor-pointer"
            onClick={onEdit}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onEdit();
                }
            }}
            role="button"
            tabIndex={0}
        >
            {params ? (
                <ActionParamPopover action={action} params={params} handler={handler}>
                    {executeButton}
                </ActionParamPopover>
            ) : (
                executeButton
            )}
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">
                    {t(`knownActions.${action.name.replaceAll(" ", "_")}`, action.name)}
                </p>
                <p className="text-[10px] text-muted-foreground/60 truncate">
                    {formatActionMessage(action.message)}
                </p>
            </div>
        </div>
    );

    // No longer need to wrap the whole card in ActionParamPopover

    return card;
}

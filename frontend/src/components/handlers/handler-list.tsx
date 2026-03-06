import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Activity, Cable, History, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useReorderAttributesApiAttributesReorderPut } from "@/api/generated/attributes/attributes";
import type {
    AttributeRead,
    AttributeValue,
    HandlerRead,
    HandlerTypeInfo,
} from "@/api/generated/contWatchAPI.schemas";
import {
    getListHandlersApiHandlersGetQueryKey,
    useListHandlersApiHandlersGet,
    useListHandlerTypesApiHandlersTypesGet,
    useReorderHandlersApiHandlersReorderPut,
} from "@/api/generated/handlers/handlers";
import { AttributeEditDialog } from "@/components/handlers/attribute-edit-dialog";
import { HandlerDetail } from "@/components/handlers/handler-detail";
import { HandlerWizard } from "@/components/handlers/handler-wizard";
import { SortableList } from "@/components/handlers/sortable-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContent, PageHeader } from "@/components/layout/page-header";
import { SafeIcon } from "@/components/safe-icon";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { dateFnsLocales } from "@/lib/date-locale";
import { formatStat, formatValue } from "@/lib/format-value";
import { localizeAttributeLabel } from "@/lib/localize-attribute";
import { cn } from "@/lib/utils";
import { INDICATOR_COLOR, useHandlerIndicatorStore } from "@/stores/handler-indicators";
import { useHandlerStatusStore } from "@/stores/handler-status";
import { useLiveValuesStore } from "@/stores/live-values";

export function HandlerList() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { data } = useListHandlersApiHandlersGet();
    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();
    const reorderHandlers = useReorderHandlersApiHandlersReorderPut();
    const [selectedHandlerId, setSelectedHandlerId] = useState<number | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const isMobile = useIsMobile();

    const handlers = (data?.data ?? []) as HandlerRead[];
    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];
    const typeIconMap = new Map(handlerTypes.map((ht) => [ht.type, ht.icon]));
    const typeNameMap = new Map(handlerTypes.map((ht) => [ht.type, ht.name]));
    const selectedHandler = handlers.find((h) => h.id === selectedHandlerId) ?? null;

    function handleHandlerReorder(reordered: HandlerRead[]) {
        const items = reordered.map((h, i) => ({ id: h.id, order: i }));
        const queryKey = getListHandlersApiHandlersGetQueryKey();

        queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData(queryKey, (old: unknown) => {
            if (!old || typeof old !== "object" || !("data" in old)) return old;
            return {
                ...old,
                data: reordered.map((h, i) => ({ ...h, order: i })),
            };
        });

        reorderHandlers.mutate({ data: { items } });
    }

    return (
        <>
            <PageHeader title={t("handlers.title")} actions={<HandlerWizard />} />
            <PageContent>
                {handlers.length === 0 ? (
                    <EmptyState
                        icon={Cable}
                        title={t("handlers.noHandlers")}
                        description={t("handlers.noHandlersDescription")}
                    />
                ) : (
                    <div className="md:columns-[480px] gap-3 [&>*]:mb-3 [&>*]:break-inside-avoid">
                        <SortableList
                            items={handlers}
                            onReorder={handleHandlerReorder}
                            multiColumn={!isMobile}
                            onItemClick={(handler) => {
                                setSelectedHandlerId(handler.id);
                                setDetailOpen(true);
                            }}
                            renderItem={(handler) => (
                                <HandlerCard
                                    handler={handler}
                                    icon={typeIconMap.get(handler.type)}
                                    typeName={typeNameMap.get(handler.type)}
                                />
                            )}
                        />
                    </div>
                )}
                <HandlerDetail handler={selectedHandler} open={detailOpen} onOpenChange={setDetailOpen} />
            </PageContent>
        </>
    );
}

function HandlerCard({
    handler,
    icon,
    typeName,
}: {
    handler: HandlerRead;
    icon: string | undefined;
    typeName: string | undefined;
}) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const status = useHandlerStatusStore((s) => s.statuses[handler.id]);
    const reorder = useReorderAttributesApiAttributesReorderPut();
    const values = useLiveValuesStore((s) => s.values);
    const indicators = useHandlerIndicatorStore((s) => s.indicators[handler.id]);
    const [editingAttribute, setEditingAttribute] = useState<AttributeRead | null>(null);

    const isRunning = status?.running ?? false;
    const isConnected = status?.connected ?? false;

    const lastActiveText =
        isRunning && !isConnected && status?.last_active
            ? formatDistanceToNow(new Date(status.last_active), {
                  addSuffix: true,
                  locale: dateFnsLocales[i18n.language],
              })
            : null;

    const label = handler.label || typeName || handler.type;
    const attrs = ((handler.attributes ?? []) as AttributeRead[]).filter((a) => a.enabled);

    const statusColor =
        isRunning && isConnected ? "text-success" : isRunning ? "text-warning" : "text-muted-foreground/50";
    const aura =
        isRunning && isConnected
            ? { bg: "bg-success", anim: "animate-breathe opacity-15" }
            : isRunning
              ? { bg: "bg-warning", anim: "animate-ping-slow opacity-30" }
              : undefined;

    function handleReorder(reordered: AttributeRead[]) {
        const items = reordered.map((a, i) => ({ id: a.id, order: i }));
        const queryKey = getListHandlersApiHandlersGetQueryKey();

        queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData(queryKey, (old: unknown) => {
            if (!old || typeof old !== "object" || !("data" in old)) return old;
            const prev = old as { data: HandlerRead[] };
            return {
                ...prev,
                data: prev.data.map((h) =>
                    h.id === handler.id
                        ? { ...h, attributes: reordered.map((a, i) => ({ ...a, order: i })) }
                        : h,
                ),
            };
        });

        reorder.mutate({ data: { items } });
    }

    const statusDotColor =
        isRunning && isConnected ? "bg-success" : isRunning ? "bg-warning" : "bg-muted-foreground/40";
    const statusLabel = !isRunning
        ? t("handlers.stopped")
        : isConnected
          ? t("handlers.connected")
          : t("handlers.disconnected");

    return (
        <>
            <Card className="py-0 transition-all duration-200 hover:shadow-md cursor-pointer">
                <CardContent className={cn("px-4 py-2", attrs.length > 0 && "pb-0")}>
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="relative flex shrink-0 h-9 w-9 -ml-2 items-center justify-center rounded-full border border-border/60 bg-background/50">
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
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm truncate">{label}</h3>
                                {isRunning &&
                                    indicators?.map((ind) => (
                                        <span
                                            key={ind.icon}
                                            title={t(ind.tooltip_key, ind.tooltip_params ?? {})}
                                        >
                                            <SafeIcon
                                                name={ind.icon}
                                                className={cn(
                                                    "h-3.5 w-3.5 shrink-0",
                                                    INDICATOR_COLOR[ind.color],
                                                )}
                                            />
                                        </span>
                                    ))}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 min-w-0">
                                <p className="text-xs text-muted-foreground data-value truncate">
                                    {handler.description}
                                </p>
                                {(!isRunning || !isConnected) && (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
                                        <span className={cn("h-1.5 w-1.5 rounded-full", statusDotColor)} />
                                        {statusLabel}
                                        {lastActiveText && (
                                            <span className="text-muted-foreground/60">{lastActiveText}</span>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    {attrs.length > 0 && (
                        <div className="mt-2 -mx-4 border-t border-border/50">
                            <SortableList
                                items={attrs}
                                onReorder={handleReorder}
                                onLongPress={(attr) => setEditingAttribute(attr)}
                                renderItem={(attr) => <AttributeRow attr={attr} liveVal={values[attr.id]} />}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
            <AttributeEditDialog attribute={editingAttribute} onClose={() => setEditingAttribute(null)} />
        </>
    );
}

function AttributeRow({ attr, liveVal }: { attr: AttributeRead; liveVal: AttributeValue | undefined }) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const localizedLabel = localizeAttributeLabel(attr.name, attr.label, t, i18n);
    const raw = liveVal?.value;
    const formatted =
        raw != null && typeof raw === "number" && attr.unit
            ? formatValue(raw, attr.unit, attr.rounding)
            : null;
    const displayValue = raw != null ? (formatted?.value ?? String(raw)) : "-";
    const displayUnit = formatted?.unit ?? attr.unit;

    const trend = liveVal?.trend ?? 0;

    const value = liveVal?.value;
    const isBooleanValue = value === true || value === false || value === "true" || value === "false";
    const booleanOn = value === true || value === "true";

    return (
        <button
            type="button"
            className="flex w-full items-center gap-2.5 px-4 py-1.5 border-b border-border/30 last:border-b-0 hover:bg-accent/50 transition-colors text-left cursor-grab"
            onClick={(e) => {
                e.stopPropagation();
                navigate({ to: "/analytics", search: { attributes: String(attr.id) } });
            }}
        >
            <SafeIcon
                name={attr.icon}
                className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                fallback={<Activity className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
            />

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{localizedLabel || attr.name}</span>
                    {!isBooleanValue && trend > 0 && <TrendingUp className="h-3 w-3 text-success shrink-0" />}
                    {!isBooleanValue && trend < 0 && (
                        <TrendingDown className="h-3 w-3 text-destructive-foreground shrink-0" />
                    )}
                </div>
                {isBooleanValue ? (
                    liveVal?.last_changed && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <History
                                className={`h-3 w-3 ${booleanOn ? "text-info" : "text-destructive-foreground"}`}
                            />
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                                {new Date(liveVal.last_changed).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        </div>
                    )
                ) : !liveVal || liveVal.stats_stale ? (
                    <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {t("handlers.statsStale")}
                    </span>
                ) : (
                    (liveVal?.daily_min != null || liveVal?.daily_max != null) && (
                        <div className="flex items-center gap-2 mt-0.5">
                            {liveVal?.daily_min != null && (
                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                    <span className="text-info">&#8595;</span>{" "}
                                    {formatStat(liveVal.daily_min, attr.unit, attr.rounding)}
                                </span>
                            )}
                            {liveVal?.daily_max != null && (
                                <span className="text-[10px] text-muted-foreground tabular-nums">
                                    <span className="text-destructive-foreground">&#8593;</span>{" "}
                                    {formatStat(liveVal.daily_max, attr.unit, attr.rounding)}
                                </span>
                            )}
                        </div>
                    )
                )}
            </div>

            <div className="flex items-baseline gap-1 shrink-0">
                <span className="text-sm font-semibold tabular-nums">{displayValue}</span>
                {displayUnit && <span className="text-xs text-muted-foreground">{displayUnit}</span>}
            </div>
        </button>
    );
}

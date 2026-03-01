import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { Locale } from "date-fns";
import { formatDistanceToNow } from "date-fns";
import { cs, enUS } from "date-fns/locale";
import { Activity, Cable, TrendingDown, TrendingUp } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useReorderAttributesApiAttributesReorderPut } from "@/api/generated/attributes/attributes";
import type {
    AttributeRead,
    AttributeValue,
    HandlerRead,
    HandlerStatus,
    HandlerTypeInfo,
} from "@/api/generated/contWatchAPI.schemas";
import {
    getListHandlersApiHandlersGetQueryKey,
    useHandlerStatusApiHandlersHandlerIdStatusGet,
    useListHandlersApiHandlersGet,
    useListHandlerTypesApiHandlersTypesGet,
} from "@/api/generated/handlers/handlers";
import { AttributeEditDialog } from "@/components/handlers/attribute-edit-dialog";
import { HandlerDetail } from "@/components/handlers/handler-detail";
import { HandlerWizard } from "@/components/handlers/handler-wizard";
import { SortableAttributeList } from "@/components/handlers/sortable-attribute-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLiveValuesStore } from "@/stores/live-values";

export function HandlerList() {
    const { t } = useTranslation();
    const { data } = useListHandlersApiHandlersGet();
    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();
    const [selectedHandler, setSelectedHandler] = useState<HandlerRead | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const handlers = (data?.data ?? []) as HandlerRead[];
    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];
    const typeIconMap = new Map(handlerTypes.map((ht) => [ht.type, ht.icon]));

    return (
        <div className="space-y-6">
            <PageHeader title={t("handlers.title")} actions={<HandlerWizard />} />

            {handlers.length === 0 ? (
                <EmptyState
                    icon={Cable}
                    title={t("handlers.noHandlers")}
                    description={t("handlers.noHandlersDescription")}
                />
            ) : (
                <div className="grid gap-3">
                    {handlers.map((handler) => (
                        <HandlerCard
                            key={handler.id}
                            handler={handler}
                            icon={typeIconMap.get(handler.type)}
                            onOpenDetail={() => {
                                setSelectedHandler(handler);
                                setDetailOpen(true);
                            }}
                        />
                    ))}
                </div>
            )}

            <HandlerDetail handler={selectedHandler} open={detailOpen} onOpenChange={setDetailOpen} />
        </div>
    );
}

const dateFnsLocales: Record<string, Locale> = { en: enUS, cs };

function HandlerCard({
    handler,
    icon,
    onOpenDetail,
}: {
    handler: HandlerRead;
    icon: string | undefined;
    onOpenDetail: () => void;
}) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const { data: statusData } = useHandlerStatusApiHandlersHandlerIdStatusGet(handler.id, {
        query: { refetchInterval: 5000 },
    });
    const reorder = useReorderAttributesApiAttributesReorderPut();
    const values = useLiveValuesStore((s) => s.values);
    const [editingAttribute, setEditingAttribute] = useState<AttributeRead | null>(null);

    const status = statusData?.data as HandlerStatus | undefined;
    const isRunning = status?.running ?? false;
    const isConnected = status?.connected ?? false;

    const label = handler.label || handler.type;
    const attrs = ((handler.attributes ?? []) as AttributeRead[]).filter((a) => a.enabled);
    const lastActiveText = status?.last_active
        ? formatDistanceToNow(new Date(status.last_active), {
              addSuffix: true,
              locale: dateFnsLocales[i18n.language],
          })
        : null;

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

    return (
        <>
            <Card
                className="py-0 transition-all duration-200 hover:shadow-md cursor-pointer"
                onClick={onOpenDetail}
            >
                <CardContent className={cn("px-4 py-2", attrs.length > 0 && "pb-0")}>
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="relative flex shrink-0 h-5 w-5 items-center justify-center">
                            {aura && (
                                <span
                                    className={cn("absolute h-full w-full rounded-full", aura.bg, aura.anim)}
                                />
                            )}
                            {icon ? (
                                <DynamicIcon
                                    // biome-ignore lint/suspicious/noExplicitAny: icon name is dynamic from backend
                                    name={icon as any}
                                    className={cn("relative h-5 w-5", statusColor)}
                                />
                            ) : (
                                <Cable className={cn("relative h-5 w-5", statusColor)} />
                            )}
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm truncate">{label}</h3>
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
                    {attrs.length > 0 && (
                        <div className="mt-2.5 -mx-4 border-t border-border/50">
                            <SortableAttributeList
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
    const navigate = useNavigate();
    const displayValue =
        liveVal?.value != null
            ? attr.rounding != null
                ? Number(liveVal.value).toFixed(attr.rounding)
                : String(liveVal.value)
            : "-";

    const trend = liveVal?.trend ?? 0;
    const formatStat = (v: number) => (attr.rounding != null ? v.toFixed(attr.rounding) : String(v));

    return (
        <button
            type="button"
            className="flex w-full items-center gap-2.5 px-4 py-1.5 border-b border-border/30 last:border-b-0 hover:bg-accent/50 transition-colors text-left cursor-grab"
            onClick={(e) => {
                e.stopPropagation();
                navigate({ to: "/analytics", search: { attributes: String(attr.id) } });
            }}
        >
            {attr.icon ? (
                <DynamicIcon
                    // biome-ignore lint/suspicious/noExplicitAny: icon name is dynamic from backend
                    name={attr.icon as any}
                    className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                />
            ) : (
                <Activity className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
            )}

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{attr.label || attr.name}</span>
                    {trend > 0 && <TrendingUp className="h-3 w-3 text-success shrink-0" />}
                    {trend < 0 && <TrendingDown className="h-3 w-3 text-destructive-foreground shrink-0" />}
                </div>
                {(liveVal?.daily_min != null || liveVal?.daily_max != null) && (
                    <div className="flex items-center gap-2 mt-0.5">
                        {liveVal?.daily_min != null && (
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                                <span className="text-info">&#8595;</span> {formatStat(liveVal.daily_min)}
                                {attr.unit ? ` ${attr.unit}` : ""}
                            </span>
                        )}
                        {liveVal?.daily_max != null && (
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                                <span className="text-destructive-foreground">&#8593;</span>{" "}
                                {formatStat(liveVal.daily_max)}
                                {attr.unit ? ` ${attr.unit}` : ""}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-baseline gap-1 shrink-0">
                <span className="text-sm font-semibold tabular-nums">{displayValue}</span>
                {attr.unit && <span className="text-xs text-muted-foreground">{attr.unit}</span>}
            </div>
        </button>
    );
}

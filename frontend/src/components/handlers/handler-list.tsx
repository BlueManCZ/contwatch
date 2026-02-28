import { Play, Settings, Square, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { HandlerRead, HandlerStatus } from "@/api/generated/contWatchAPI.schemas";
import {
    useDeleteHandlerApiHandlersHandlerIdDelete,
    useHandlerStatusApiHandlersHandlerIdStatusGet,
    useListHandlersApiHandlersGet,
    useStartHandlerApiHandlersHandlerIdStartPost,
    useStopHandlerApiHandlersHandlerIdStopPost,
} from "@/api/generated/handlers/handlers";
import { HandlerDetail } from "@/components/handlers/handler-detail";
import { HandlerForm } from "@/components/handlers/handler-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HandlerList() {
    const { t } = useTranslation();
    const { data } = useListHandlersApiHandlersGet();
    const [selectedHandler, setSelectedHandler] = useState<HandlerRead | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const handlers = (data?.data ?? []) as HandlerRead[];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t("handlers.title")}</h1>
                <HandlerForm />
            </div>

            {handlers.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">{t("handlers.noHandlers")}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t("handlers.noHandlersDescription")}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {handlers.map((handler) => (
                        <HandlerCard
                            key={handler.id}
                            handler={handler}
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

function HandlerCard({ handler, onOpenDetail }: { handler: HandlerRead; onOpenDetail: () => void }) {
    const { t } = useTranslation();
    const startHandler = useStartHandlerApiHandlersHandlerIdStartPost();
    const stopHandler = useStopHandlerApiHandlersHandlerIdStopPost();
    const deleteHandler = useDeleteHandlerApiHandlersHandlerIdDelete();
    const { data: statusData } = useHandlerStatusApiHandlersHandlerIdStatusGet(handler.id, {
        query: { refetchInterval: 5000 },
    });

    const status = statusData?.data as HandlerStatus | undefined;
    const isRunning = status?.running ?? false;
    const isConnected = status?.connected ?? false;

    const label = (handler.options as { label?: string })?.label || handler.type;
    const attrCount = handler.attributes?.length ?? 0;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <StatusDot running={isRunning} connected={isConnected} />
                        <div>
                            <CardTitle className="text-base">{label}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {handler.type} &middot; {attrCount} {t("handlers.attributes").toLowerCase()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {isRunning ? (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    stopHandler.mutate(
                                        { handlerId: handler.id },
                                        { onSuccess: () => toast.success(t("toast.handlerStopped")) },
                                    )
                                }
                                disabled={stopHandler.isPending}
                            >
                                <Square className="h-3 w-3 mr-1" />
                                {t("handlers.stop")}
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    startHandler.mutate(
                                        { handlerId: handler.id },
                                        { onSuccess: () => toast.success(t("toast.handlerStarted")) },
                                    )
                                }
                                disabled={startHandler.isPending}
                            >
                                <Play className="h-3 w-3 mr-1" />
                                {t("handlers.start")}
                            </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={onOpenDetail}>
                            <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                                deleteHandler.mutate(
                                    { handlerId: handler.id },
                                    { onSuccess: () => toast.success(t("toast.handlerDeleted")) },
                                )
                            }
                            disabled={deleteHandler.isPending}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            {isRunning && (
                <CardContent className="pt-0">
                    <div className="flex items-center gap-2">
                        <Badge variant={isConnected ? "default" : "secondary"}>
                            {isConnected ? t("handlers.connected") : t("handlers.disconnected")}
                        </Badge>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

function StatusDot({ running, connected }: { running: boolean; connected: boolean }) {
    let color = "bg-gray-400"; // stopped
    if (running && connected) color = "bg-green-500";
    else if (running) color = "bg-yellow-500";

    return <span className={`h-3 w-3 rounded-full ${color}`} />;
}

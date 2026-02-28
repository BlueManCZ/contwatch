import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
    useCreateAttributeApiAttributesPost,
    useListAttributesApiAttributesGet,
} from "@/api/generated/attributes/attributes";
import type { AttributeRead, HandlerRead, HandlerStatus } from "@/api/generated/contWatchAPI.schemas";
import {
    useAvailableAttributesApiHandlersHandlerIdAvailableAttributesGet,
    useHandlerStatusApiHandlersHandlerIdStatusGet,
} from "@/api/generated/handlers/handlers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLiveValuesStore } from "@/stores/live-values";
import { AttributeEditDialog } from "./attribute-edit-dialog";
import { HandlerConfigEditDialog } from "./handler-config-edit-dialog";

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
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{t("handlers.details")}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-6">
                    <HandlerInfo handler={handler} onEditConfig={() => setEditConfigHandler(handler)} />
                    <RegisteredAttributes handler={handler} />
                    <AvailableAttributes handler={handler} />
                </div>
            </SheetContent>
            <HandlerConfigEditDialog handler={editConfigHandler} onClose={() => setEditConfigHandler(null)} />
        </Sheet>
    );
}

function HandlerInfo({ handler, onEditConfig }: { handler: HandlerRead; onEditConfig: () => void }) {
    const { t } = useTranslation();
    const { data: statusData } = useHandlerStatusApiHandlersHandlerIdStatusGet(handler.id, {
        query: { refetchInterval: 5000 },
    });
    const status = statusData?.data as HandlerStatus | undefined;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t("handlers.type")}:</span>
                <span className="text-sm text-muted-foreground">{handler.type}</span>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onEditConfig}
                    title={t("handlers.editConfig")}
                    className="ml-auto"
                >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t("handlers.status")}:</span>
                {status?.running ? (
                    <Badge variant="default">{t("handlers.running")}</Badge>
                ) : (
                    <Badge variant="secondary">{t("handlers.stopped")}</Badge>
                )}
                {status?.connected && <Badge variant="outline">{t("handlers.connected")}</Badge>}
            </div>
        </div>
    );
}

function RegisteredAttributes({ handler }: { handler: HandlerRead }) {
    const { t } = useTranslation();
    const { data: attrsData } = useListAttributesApiAttributesGet({ handler_id: handler.id });
    const values = useLiveValuesStore((s) => s.values);
    const attrs = (attrsData?.data ?? []) as AttributeRead[];
    const [editingAttribute, setEditingAttribute] = useState<AttributeRead | null>(null);

    if (attrs.length === 0) return null;

    return (
        <div>
            <h4 className="text-sm font-semibold mb-2">{t("handlers.registeredAttributes")}</h4>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("handlers.name")}</TableHead>
                        <TableHead>{t("handlers.label")}</TableHead>
                        <TableHead>{t("handlers.value")}</TableHead>
                        <TableHead>{t("handlers.unit")}</TableHead>
                        <TableHead className="w-10" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {attrs.map((attr) => {
                        const liveVal = values[attr.id];
                        return (
                            <TableRow key={attr.id}>
                                <TableCell className="font-mono text-xs">{attr.name}</TableCell>
                                <TableCell>{attr.label ?? "-"}</TableCell>
                                <TableCell>
                                    {liveVal?.value != null
                                        ? attr.rounding != null
                                            ? Number(liveVal.value).toFixed(attr.rounding)
                                            : String(liveVal.value)
                                        : "-"}
                                </TableCell>
                                <TableCell>{attr.unit ?? "-"}</TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => setEditingAttribute(attr)}
                                        title={t("handlers.editAttribute")}
                                    >
                                        <Pencil className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <AttributeEditDialog attribute={editingAttribute} onClose={() => setEditingAttribute(null)} />
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

    return (
        <div>
            <h4 className="text-sm font-semibold mb-2">{t("handlers.availableAttributes")}</h4>
            {available.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("handlers.noAvailableAttributes")}</p>
            ) : (
                <div className="space-y-1">
                    {available.map((name) => (
                        <div
                            key={name}
                            className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted"
                        >
                            <span className="font-mono text-xs">{name}</span>
                            <Button
                                size="sm"
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
            )}
        </div>
    );
}

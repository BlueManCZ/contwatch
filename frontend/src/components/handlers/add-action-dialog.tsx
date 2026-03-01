import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useCreateActionApiActionsPost } from "@/api/generated/actions/actions";
import type { HandlerRead, HandlerTypeInfo } from "@/api/generated/contWatchAPI.schemas";
import { useListHandlerTypesApiHandlersTypesGet } from "@/api/generated/handlers/handlers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ActionMessageEditor } from "./action-message-editor";
import { formatActionMessage } from "./action-utils";

interface AddActionDialogProps {
    handler: HandlerRead;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function defaultMessage(knownActions: { message: string }[]): string {
    // Check if known actions use HTTP format
    for (const ka of knownActions) {
        try {
            const obj = JSON.parse(ka.message);
            if (obj.method || obj.path) return JSON.stringify({ method: "GET", path: "/" });
        } catch {
            /* empty */
        }
    }
    return "{}";
}

export function AddActionDialog({ handler, open, onOpenChange }: AddActionDialogProps) {
    const { t } = useTranslation();
    const createAction = useCreateActionApiActionsPost();
    const { data: typesData } = useListHandlerTypesApiHandlersTypesGet();

    const handlerTypes = (typesData?.data ?? []) as HandlerTypeInfo[];
    const handlerType = handlerTypes.find((ht) => ht.type === handler.type);
    const knownActions = handlerType?.known_actions ?? [];

    const existingNames = new Set(handler.actions?.map((a) => a.name));

    const [name, setName] = useState("");
    const [message, setMessage] = useState(() => defaultMessage(knownActions));

    function handlePresetClick(presetName: string, presetMessage: string) {
        setName(presetName);
        setMessage(presetMessage);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name || !message) return;
        createAction.mutate(
            { data: { name, message, handler_id: handler.id } },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    setName("");
                    setMessage(defaultMessage(knownActions));
                    toast.success(t("toast.actionCreated"));
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("handlers.addAction")}</DialogTitle>
                </DialogHeader>

                {knownActions.length > 0 && (
                    <>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground uppercase tracking-widest">
                                {t("handlers.presets")}
                            </Label>
                            <div className="space-y-1.5">
                                {knownActions.map((ka) => {
                                    const added = existingNames.has(ka.name);
                                    const selected = name === ka.name && message === ka.message;
                                    return (
                                        <button
                                            key={ka.name}
                                            type="button"
                                            onClick={() => handlePresetClick(ka.name, ka.message)}
                                            className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent ${selected ? "border-primary bg-accent" : ""}`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium">{ka.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {formatActionMessage(ka.message)}
                                                </p>
                                            </div>
                                            {added && (
                                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                                    {t("handlers.presetAdded")}
                                                </Badge>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <Separator />
                    </>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t("handlers.name")}</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <ActionMessageEditor value={message} onChange={setMessage} />
                    </div>
                    <DialogFooter className="mt-4">
                        <Button type="submit" disabled={!name || !message || createAction.isPending}>
                            {t("common.add")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

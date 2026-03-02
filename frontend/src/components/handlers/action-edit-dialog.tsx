import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
    useDeleteActionApiActionsActionIdDelete,
    useUpdateActionApiActionsActionIdPatch,
} from "@/api/generated/actions/actions";
import type { ActionRead, ActionUpdate } from "@/api/generated/contWatchAPI.schemas";
import { getListHandlersApiHandlersGetQueryKey } from "@/api/generated/handlers/handlers";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActionMessageEditor } from "./action-message-editor";

interface ActionEditDialogProps {
    action: ActionRead | null;
    onClose: () => void;
}

export function ActionEditDialog({ action, onClose }: ActionEditDialogProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const updateAction = useUpdateActionApiActionsActionIdPatch();
    const deleteAction = useDeleteActionApiActionsActionIdDelete();

    const open = action !== null;

    function handleOpenChange(next: boolean) {
        if (!next) onClose();
    }

    useEffect(() => {
        if (action) {
            setName(action.name);
            setMessage(action.message);
        }
    }, [action]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!action) return;

        const data: ActionUpdate = {};
        if (name !== action.name) data.name = name;
        if (message !== action.message) data.message = message;

        updateAction.mutate(
            { actionId: action.id, data },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({
                        queryKey: getListHandlersApiHandlersGetQueryKey(),
                    });
                    onClose();
                    toast.success(t("toast.actionUpdated"));
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("handlers.editAction")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("handlers.name")}</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <ActionMessageEditor value={message} onChange={setMessage} />
                    </div>
                    <DialogFooter className="flex-row justify-between sm:justify-between">
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={deleteAction.isPending}
                            onClick={() => setConfirmDeleteOpen(true)}
                        >
                            {t("common.delete")}
                        </Button>
                        <Button type="submit" disabled={updateAction.isPending}>
                            {t("common.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
            <ConfirmDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                onConfirm={() => {
                    if (!action) return;
                    deleteAction.mutate(
                        { actionId: action.id },
                        {
                            onSuccess: () => {
                                queryClient.invalidateQueries({
                                    queryKey: getListHandlersApiHandlersGetQueryKey(),
                                });
                                onClose();
                                toast.success(t("toast.actionDeleted"));
                            },
                        },
                    );
                }}
                description={t("confirm.deleteAction")}
            />
        </Dialog>
    );
}

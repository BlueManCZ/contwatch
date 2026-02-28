import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
    useCreateActionApiActionsPost,
    useDeleteActionApiActionsActionIdDelete,
    useListActionsApiActionsGet,
} from "@/api/generated/actions/actions";
import type { ActionRead } from "@/api/generated/contWatchAPI.schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export function ActionsManager() {
    const { t } = useTranslation();
    const { data } = useListActionsApiActionsGet();
    const deleteAction = useDeleteActionApiActionsActionIdDelete();

    const actions = (data?.data ?? []) as ActionRead[];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t("actions.title")}</h1>
                <AddActionDialog />
            </div>

            {actions.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">{t("actions.noActions")}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t("actions.noActionsDescription")}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("actions.name")}</TableHead>
                                <TableHead>{t("actions.message")}</TableHead>
                                <TableHead className="w-16" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {actions.map((action) => (
                                <TableRow key={action.id}>
                                    <TableCell className="font-medium">{action.name}</TableCell>
                                    <TableCell>
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                            {action.message}
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() =>
                                                deleteAction.mutate(
                                                    { actionId: action.id },
                                                    {
                                                        onSuccess: () =>
                                                            toast.success(t("toast.actionDeleted")),
                                                    },
                                                )
                                            }
                                            title={t("common.delete")}
                                        >
                                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}

function AddActionDialog() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const createAction = useCreateActionApiActionsPost();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name || !message) return;
        createAction.mutate(
            { data: { name, message } },
            {
                onSuccess: () => {
                    setOpen(false);
                    setName("");
                    setMessage("");
                    toast.success(t("toast.actionCreated"));
                },
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
                render={
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        {t("actions.addAction")}
                    </Button>
                }
            />
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("actions.addAction")}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>{t("actions.name")}</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t("actions.name")}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("actions.message")}</Label>
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder='{"method": "GET", "path": "/relay/0", "params": {"turn": "on"}}'
                                rows={4}
                                className="font-mono text-sm"
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={!name || !message || createAction.isPending}>
                            {t("common.add")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

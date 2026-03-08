import { useQueryClient } from "@tanstack/react-query";
import { Edit2, FolderOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SubWorkflowSummary } from "@/api/generated/contWatchAPI.schemas";
import {
    getListSubWorkflowsApiSubWorkflowsGetQueryKey,
    useCreateSubWorkflowApiSubWorkflowsPost,
    useDeleteSubWorkflowApiSubWorkflowsSubWorkflowIdDelete,
    useListSubWorkflowsApiSubWorkflowsGet,
    useUpdateSubWorkflowApiSubWorkflowsSubWorkflowIdPatch,
} from "@/api/generated/sub-workflows/sub-workflows";
import { getGetNodeDefinitionsApiActionsWorkflowNodesGetQueryKey } from "@/api/generated/workflow/workflow";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useWorkflowDisplayStore } from "@/stores/workflow-display";

interface SubWorkflowFormState {
    name: string;
    description: string;
}

function SubWorkflowFormDialog({
    open,
    onOpenChange,
    title,
    initial,
    onSubmit,
    isPending,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    initial?: SubWorkflowFormState;
    onSubmit: (data: SubWorkflowFormState) => void;
    isPending?: boolean;
}) {
    const { t } = useTranslation();
    const [name, setName] = useState(initial?.name ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!isPending) onOpenChange(v);
            }}
        >
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="space-y-1">
                        <Label>{t("subWorkflows.name")}</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("subWorkflows.namePlaceholder")}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>{t("subWorkflows.description")}</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t("subWorkflows.descriptionPlaceholder")}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button
                        disabled={!name.trim() || isPending}
                        onClick={() => onSubmit({ name: name.trim(), description: description.trim() })}
                    >
                        {t("common.save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function SubWorkflowManager() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { data: listResponse } = useListSubWorkflowsApiSubWorkflowsGet();
    const subWorkflows = (listResponse?.data ?? []) as SubWorkflowSummary[];

    const pushBreadcrumb = useWorkflowDisplayStore((s) => s.pushBreadcrumb);

    const createMutation = useCreateSubWorkflowApiSubWorkflowsPost();
    const updateMutation = useUpdateSubWorkflowApiSubWorkflowsSubWorkflowIdPatch();
    const deleteMutation = useDeleteSubWorkflowApiSubWorkflowsSubWorkflowIdDelete();

    const [sheetOpen, setSheetOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<SubWorkflowSummary | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SubWorkflowSummary | null>(null);

    function invalidate() {
        queryClient.invalidateQueries({
            queryKey: getListSubWorkflowsApiSubWorkflowsGetQueryKey(),
        });
        queryClient.invalidateQueries({
            queryKey: getGetNodeDefinitionsApiActionsWorkflowNodesGetQueryKey(),
        });
    }

    function handleCreate(data: SubWorkflowFormState) {
        createMutation.mutate(
            { data: { name: data.name, description: data.description } },
            {
                onSuccess: () => {
                    setCreateOpen(false);
                    invalidate();
                },
            },
        );
    }

    function handleUpdate(data: SubWorkflowFormState) {
        if (!editTarget) return;
        updateMutation.mutate(
            {
                subWorkflowId: editTarget.id,
                data: { name: data.name, description: data.description },
            },
            {
                onSuccess: () => {
                    setEditTarget(null);
                    invalidate();
                },
            },
        );
    }

    function handleDelete() {
        if (!deleteTarget) return;
        deleteMutation.mutate(
            { subWorkflowId: deleteTarget.id },
            {
                onSuccess: () => {
                    setDeleteTarget(null);
                    invalidate();
                },
            },
        );
    }

    function handleOpen(sw: SubWorkflowSummary) {
        pushBreadcrumb({ subWorkflowId: sw.id, label: sw.name });
        setSheetOpen(false);
    }

    return (
        <>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger
                    render={
                        <Button variant="outline" size="sm">
                            <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                            {t("subWorkflows.title")}
                        </Button>
                    }
                />
                <SheetContent side="bottom" className="max-h-[60vh]">
                    <SheetHeader>
                        <SheetTitle>{t("subWorkflows.title")}</SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto p-4 space-y-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setCreateOpen(true)}
                        >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            {t("subWorkflows.create")}
                        </Button>
                        {subWorkflows.map((sw) => (
                            <div
                                key={sw.id}
                                className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 shadow-sm"
                            >
                                <button
                                    type="button"
                                    className="flex-1 cursor-pointer text-left hover:text-primary transition-colors"
                                    onClick={() => handleOpen(sw)}
                                >
                                    <span className="text-xs font-medium">{sw.name}</span>
                                    {sw.description && (
                                        <span className="block text-[10px] text-muted-foreground mt-0.5">
                                            {sw.description}
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    className="cursor-pointer p-1 text-muted-foreground hover:text-foreground transition-colors"
                                    onClick={() => setEditTarget(sw)}
                                    title={t("common.edit")}
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    className="cursor-pointer p-1 text-muted-foreground hover:text-destructive transition-colors"
                                    onClick={() => setDeleteTarget(sw)}
                                    title={t("common.delete")}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                        {subWorkflows.length === 0 && (
                            <p className="text-center text-xs text-muted-foreground py-4">
                                {t("subWorkflows.empty")}
                            </p>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <SubWorkflowFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                title={t("subWorkflows.create")}
                onSubmit={handleCreate}
                isPending={createMutation.isPending}
            />

            {editTarget && (
                <SubWorkflowFormDialog
                    open
                    onOpenChange={(v) => {
                        if (!v) setEditTarget(null);
                    }}
                    title={t("subWorkflows.edit")}
                    initial={{ name: editTarget.name, description: editTarget.description }}
                    onSubmit={handleUpdate}
                    isPending={updateMutation.isPending}
                />
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(v) => {
                    if (!v) setDeleteTarget(null);
                }}
                onConfirm={handleDelete}
                description={t("subWorkflows.deleteConfirm", { name: deleteTarget?.name })}
                variant="destructive"
                isPending={deleteMutation.isPending}
            />
        </>
    );
}

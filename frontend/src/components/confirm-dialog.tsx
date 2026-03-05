import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title?: string;
    description: string;
    confirmLabel?: string;
    variant?: "destructive" | "default";
    isPending?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    variant = "destructive",
    isPending,
    onConfirm,
}: ConfirmDialogProps) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>{title ?? t("confirm.title")}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button variant={variant} onClick={onConfirm} disabled={isPending}>
                        {confirmLabel ?? t("common.delete")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

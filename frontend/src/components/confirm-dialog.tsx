import { useTranslation } from "react-i18next";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    onConfirm,
    title,
    description,
    confirmLabel,
    variant = "destructive",
    isPending,
}: ConfirmDialogProps) {
    const { t } = useTranslation();

    return (
        <AlertDialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogTitle>{title ?? t("confirm.title")}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction variant={variant} onClick={onConfirm} disabled={isPending}>
                        {confirmLabel ?? t("common.delete")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

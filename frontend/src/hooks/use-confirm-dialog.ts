import { useCallback, useState } from "react";

interface ConfirmDialogState<T> {
    /** The pending value, or null when closed */
    pending: T | null;
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Open the dialog, optionally with a value (defaults to `true` for boolean usage) */
    open: (value?: T) => void;
    /** Close the dialog */
    close: () => void;
    /** Props to spread onto ConfirmDialog: `open` and `onOpenChange` */
    dialogProps: {
        open: boolean;
        onOpenChange: (open: boolean) => void;
    };
}

export function useConfirmDialog<T = boolean>(): ConfirmDialogState<T> {
    const [pending, setPending] = useState<T | null>(null);

    const open = useCallback((value?: T) => {
        setPending((value ?? true) as T);
    }, []);

    const close = useCallback(() => {
        setPending(null);
    }, []);

    const onOpenChange = useCallback((isOpen: boolean) => {
        if (!isOpen) setPending(null);
    }, []);

    return {
        pending,
        isOpen: pending !== null,
        open,
        close,
        dialogProps: {
            open: pending !== null,
            onOpenChange,
        },
    };
}

import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
    useCheckOutOfRangeApiAttributesAttributeIdOutOfRangeGet,
    useDeleteOutOfRangeApiAttributesAttributeIdOutOfRangeDelete,
} from "@/api/generated/attributes/attributes";
import type { AttributeRead, OutOfRangeDayItem } from "@/api/generated/contWatchAPI.schemas";
import { getListDataStatsApiDataStatsGetQueryKey } from "@/api/generated/data-stats/data-stats";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface OutOfRangeDialogProps {
    attribute: AttributeRead;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OutOfRangeDialog({ attribute, open, onOpenChange }: OutOfRangeDialogProps) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const tzOffset = useMemo(() => new Date().getTimezoneOffset(), []);

    const { data, isLoading } = useCheckOutOfRangeApiAttributesAttributeIdOutOfRangeGet(
        attribute.id,
        { tz_offset: tzOffset },
        {
            query: { enabled: open },
        },
    );

    const deleteMutation = useDeleteOutOfRangeApiAttributesAttributeIdOutOfRangeDelete();

    const items: OutOfRangeDayItem[] = data?.status === 200 ? data.data : [];
    const allSelected = items.length > 0 && selectedDates.size === items.length;
    const totalSelected = items
        .filter((item) => selectedDates.has(item.date))
        .reduce((sum, item) => sum + item.count, 0);

    function handleOpenChange(next: boolean) {
        if (deleteMutation.isPending) return;
        if (next) {
            setSelectedDates(new Set());
        }
        onOpenChange(next);
    }

    function toggleDate(date: string) {
        setSelectedDates((prev) => {
            const next = new Set(prev);
            if (next.has(date)) {
                next.delete(date);
            } else {
                next.add(date);
            }
            return next;
        });
    }

    function toggleAll() {
        if (allSelected) {
            setSelectedDates(new Set());
        } else {
            setSelectedDates(new Set(items.map((item) => item.date)));
        }
    }

    function handleDelete() {
        deleteMutation.mutate(
            { attributeId: attribute.id, data: { dates: [...selectedDates], tz_offset: tzOffset } },
            {
                onSuccess: (result) => {
                    const deleted = result.status === 200 ? result.data.deleted : 0;
                    toast.success(t("handlers.outOfRangeDeleted", { count: deleted }));
                    onOpenChange(false);
                    queryClient.invalidateQueries({
                        queryKey: getListDataStatsApiDataStatsGetQueryKey(),
                    });
                },
            },
        );
    }

    function formatDate(dateStr: string) {
        return new Date(`${dateStr}T00:00:00`).toLocaleDateString(i18n.language, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("handlers.outOfRangeTitle")}</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                    {isLoading && <p className="text-muted-foreground text-sm">{t("common.loading")}</p>}
                    {!isLoading && items.length === 0 && (
                        <p className="text-muted-foreground text-sm">{t("handlers.outOfRangeNone")}</p>
                    )}
                    {!isLoading && items.length > 0 && (
                        <>
                            <p className="text-muted-foreground mb-3 text-sm">
                                {t("handlers.outOfRangeDescription")}
                            </p>
                            <div className="max-h-64 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="py-2 pr-3 text-left">
                                                <Checkbox
                                                    checked={allSelected}
                                                    onCheckedChange={toggleAll}
                                                    className="cursor-pointer"
                                                />
                                            </th>
                                            <th className="py-2 text-left font-medium">{t("common.date")}</th>
                                            <th className="py-2 text-right font-medium">
                                                {t("common.count")}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr
                                                key={item.date}
                                                className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                                                onClick={() => toggleDate(item.date)}
                                            >
                                                <td className="py-2 pr-3">
                                                    <Checkbox
                                                        checked={selectedDates.has(item.date)}
                                                        onCheckedChange={() => toggleDate(item.date)}
                                                        className="cursor-pointer"
                                                    />
                                                </td>
                                                <td className="py-2">{formatDate(item.date)}</td>
                                                <td className="py-2 text-right tabular-nums">
                                                    {item.count.toLocaleString(i18n.language)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={deleteMutation.isPending}
                    >
                        {t("common.close")}
                    </Button>
                    {items.length > 0 && (
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={selectedDates.size === 0 || deleteMutation.isPending}
                        >
                            {t("handlers.outOfRangeDeleteSelected", { count: totalSelected })}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

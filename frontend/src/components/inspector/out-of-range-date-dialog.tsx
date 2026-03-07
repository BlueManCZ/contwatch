import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
    useCheckOutOfRangeByDateApiAttributesOutOfRangeByDatePost,
    useDeleteOutOfRangeByDateApiAttributesOutOfRangeByDateDelete,
    useListAttributesApiAttributesGet,
} from "@/api/generated/attributes/attributes";
import type {
    OutOfRangeByDateAttributeBounds,
    OutOfRangeByDateItem,
} from "@/api/generated/contWatchAPI.schemas";
import { getListDataStatsApiDataStatsGetQueryKey } from "@/api/generated/data-stats/data-stats";
import { getChartDataApiDataUnitsChartGetQueryKey } from "@/api/generated/data-units/data-units";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BoundsEntry {
    attributeId: number;
    name: string;
    min: string;
    max: string;
}

interface OutOfRangeDateDialogProps {
    attributeIds: number[];
    date: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OutOfRangeDateDialog({ attributeIds, date, open, onOpenChange }: OutOfRangeDateDialogProps) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();

    const { data: attributesData } = useListAttributesApiAttributesGet(undefined, {
        query: { enabled: open },
    });
    const allAttributes = attributesData?.status === 200 ? attributesData.data : [];

    const [bounds, setBounds] = useState<BoundsEntry[]>([]);
    const [results, setResults] = useState<OutOfRangeByDateItem[] | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const tzOffset = useMemo(() => new Date().getTimezoneOffset(), []);
    const checkMutation = useCheckOutOfRangeByDateApiAttributesOutOfRangeByDatePost();
    const deleteMutation = useDeleteOutOfRangeByDateApiAttributesOutOfRangeByDateDelete();

    // Initialize bounds from attribute settings when dialog opens
    useEffect(() => {
        if (open && allAttributes.length > 0) {
            const entries: BoundsEntry[] = attributeIds
                .map((id) => {
                    const attr = allAttributes.find((a) => a.id === id);
                    if (!attr) return null;
                    return {
                        attributeId: id,
                        name: attr.label ?? attr.name,
                        min: attr.min_value != null ? String(attr.min_value) : "",
                        max: attr.max_value != null ? String(attr.max_value) : "",
                    };
                })
                .filter((e): e is BoundsEntry => e !== null);
            setBounds(entries);
            setResults(null);
            setSelectedIds(new Set());
        }
    }, [open, allAttributes, attributeIds]);

    const boundsPayload = useMemo(
        (): OutOfRangeByDateAttributeBounds[] =>
            bounds
                .filter((b) => b.min !== "" || b.max !== "")
                .map((b) => ({
                    attribute_id: b.attributeId,
                    min_value: b.min !== "" ? Number.parseFloat(b.min) : null,
                    max_value: b.max !== "" ? Number.parseFloat(b.max) : null,
                })),
        [bounds],
    );

    const hasAnyBounds = boundsPayload.length > 0;
    const items = results ?? [];
    const allSelected = items.length > 0 && selectedIds.size === items.length;
    const totalSelected = items
        .filter((item) => selectedIds.has(item.attribute_id))
        .reduce((sum, item) => sum + item.count, 0);

    function handleOpenChange(next: boolean) {
        if (checkMutation.isPending || deleteMutation.isPending) return;
        onOpenChange(next);
    }

    function updateBound(index: number, field: "min" | "max", value: string) {
        setBounds((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
        setResults(null);
        setSelectedIds(new Set());
    }

    function handleCheck() {
        checkMutation.mutate(
            { data: { date, tz_offset: tzOffset, attributes: boundsPayload } },
            {
                onSuccess: (result) => {
                    setResults(result.status === 200 ? result.data : []);
                    setSelectedIds(new Set());
                },
            },
        );
    }

    function toggleAttribute(id: number) {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function toggleAll() {
        if (allSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(items.map((item) => item.attribute_id)));
    }

    function handleDelete() {
        const selectedBounds = boundsPayload.filter((b) => selectedIds.has(b.attribute_id));
        deleteMutation.mutate(
            { data: { date, tz_offset: tzOffset, attributes: selectedBounds } },
            {
                onSuccess: (result) => {
                    const deleted = result.status === 200 ? result.data.deleted : 0;
                    toast.success(t("handlers.outOfRangeDeleted", { count: deleted }));
                    onOpenChange(false);
                    for (const id of attributeIds) {
                        queryClient.invalidateQueries({
                            queryKey: getChartDataApiDataUnitsChartGetQueryKey({
                                attribute_ids: String(id),
                                date,
                            }),
                        });
                    }
                    queryClient.invalidateQueries({
                        queryKey: getListDataStatsApiDataStatsGetQueryKey(),
                    });
                },
            },
        );
    }

    const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString(i18n.language, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("inspector.outOfRangeDateTitle", { date: formattedDate })}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    {/* Bounds editor */}
                    <div className="space-y-3">
                        {bounds.map((entry, index) => (
                            <div key={entry.attributeId} className="space-y-1.5">
                                <Label className="text-xs font-medium">{entry.name}</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        type="number"
                                        step="any"
                                        placeholder={t("handlers.minValue")}
                                        value={entry.min}
                                        onChange={(e) => updateBound(index, "min", e.target.value)}
                                    />
                                    <Input
                                        type="number"
                                        step="any"
                                        placeholder={t("handlers.maxValue")}
                                        value={entry.max}
                                        onChange={(e) => updateBound(index, "max", e.target.value)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Results */}
                    {results !== null && items.length === 0 && (
                        <p className="text-muted-foreground text-sm">{t("handlers.outOfRangeNone")}</p>
                    )}
                    {items.length > 0 && (
                        <div className="max-h-48 overflow-y-auto">
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
                                        <th className="py-2 text-left font-medium">
                                            {t("handlers.attribute")}
                                        </th>
                                        <th className="py-2 text-right font-medium">{t("common.count")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr
                                            key={item.attribute_id}
                                            className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                                            onClick={() => toggleAttribute(item.attribute_id)}
                                        >
                                            <td className="py-2 pr-3">
                                                <Checkbox
                                                    checked={selectedIds.has(item.attribute_id)}
                                                    onCheckedChange={() => toggleAttribute(item.attribute_id)}
                                                    className="cursor-pointer"
                                                />
                                            </td>
                                            <td className="py-2">{item.attribute_name}</td>
                                            <td className="py-2 text-right tabular-nums">
                                                {item.count.toLocaleString(i18n.language)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={checkMutation.isPending || deleteMutation.isPending}
                    >
                        {t("common.close")}
                    </Button>
                    {results === null || items.length === 0 ? (
                        <Button onClick={handleCheck} disabled={!hasAnyBounds || checkMutation.isPending}>
                            {t("inspector.checkOutOfRange")}
                        </Button>
                    ) : (
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={selectedIds.size === 0 || deleteMutation.isPending}
                        >
                            {t("handlers.outOfRangeDeleteSelected", { count: totalSelected })}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

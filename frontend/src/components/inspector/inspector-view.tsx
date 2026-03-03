import { useNavigate } from "@tanstack/react-router";
import { addDays, format, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, LineChart } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AttributeChart } from "@/components/charts/attribute-chart";
import { AttributeSelector } from "@/components/inspector/attribute-selector";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

interface InspectorViewProps {
    attributesParam?: string;
    dateParam?: string;
}

export function InspectorView({ attributesParam, dateParam }: InspectorViewProps) {
    const { t } = useTranslation();
    const navigate = useNavigate({ from: "/analytics" });

    const selectedIds = useMemo(() => {
        if (!attributesParam) return [];
        return attributesParam
            .split(",")
            .map(Number)
            .filter((n) => !Number.isNaN(n) && n > 0);
    }, [attributesParam]);

    const date = dateParam || format(new Date(), "yyyy-MM-dd");

    function updateSearch(attrs: number[], d: string) {
        navigate({
            search: {
                attributes: attrs.length > 0 ? attrs.join(",") : undefined,
                date: d !== format(new Date(), "yyyy-MM-dd") ? d : undefined,
            },
            replace: true,
        });
    }

    function handleSelectionChange(ids: number[]) {
        updateSearch(ids, date);
    }

    function goToPrevDay() {
        updateSearch(selectedIds, format(subDays(new Date(date), 1), "yyyy-MM-dd"));
    }

    function goToNextDay() {
        updateSearch(selectedIds, format(addDays(new Date(date), 1), "yyyy-MM-dd"));
    }

    function handleDateChange(newDate: string) {
        updateSearch(selectedIds, newDate);
    }

    return (
        <div className="flex flex-col min-h-0 flex-1">
            <PageHeader
                title={t("inspector.title")}
                actions={
                    <>
                        {selectedIds.length > 0 && (
                            <div className="flex items-center h-8 rounded-[min(var(--radius-md),10px)] border border-border bg-background shadow-xs dark:border-input dark:bg-input/30 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={goToPrevDay}
                                    title={t("chart.previousDay")}
                                    className="flex items-center justify-center h-full w-8 text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-input/50 transition-colors"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </button>
                                <div className="w-px self-stretch bg-border dark:bg-input" />
                                <div className="relative flex items-center h-full px-2.5">
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => handleDateChange(e.target.value)}
                                        className="bg-transparent font-mono text-xs tabular-nums tracking-tight outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-40 [&::-webkit-calendar-picker-indicator]:hover:opacity-70 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:transition-opacity"
                                    />
                                </div>
                                <div className="w-px self-stretch bg-border dark:bg-input" />
                                <button
                                    type="button"
                                    onClick={goToNextDay}
                                    title={t("chart.nextDay")}
                                    className="flex items-center justify-center h-full w-8 text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-input/50 transition-colors"
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                        <AttributeSelector
                            selectedIds={selectedIds}
                            onSelectionChange={handleSelectionChange}
                        />
                    </>
                }
            />

            {selectedIds.length > 0 ? (
                <div className="flex flex-col min-h-0 flex-1 animate-fade-in">
                    <AttributeChart attributeIds={selectedIds} date={date} />
                </div>
            ) : (
                <EmptyState
                    icon={LineChart}
                    title={t("inspector.noAttributes")}
                    description={t("inspector.noAttributesDescription")}
                    action={
                        <AttributeSelector
                            selectedIds={selectedIds}
                            onSelectionChange={handleSelectionChange}
                            showLabel
                        />
                    }
                />
            )}
        </div>
    );
}

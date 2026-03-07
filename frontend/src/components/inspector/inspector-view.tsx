import { useNavigate } from "@tanstack/react-router";
import { addDays, format, subDays } from "date-fns";
import { BarChart3, ChevronLeft, ChevronRight, LineChart } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AttributeChart } from "@/components/charts/attribute-chart";
import { DailyStatsChart } from "@/components/charts/daily-stats-chart";
import { AttributeSelector } from "@/components/inspector/attribute-selector";
import { OutOfRangeDateDialog } from "@/components/inspector/out-of-range-date-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { PageContent, PageHeader } from "@/components/layout/page-header";

const DEFAULT_DAYS = 30;
const PERIOD_PRESETS = [7, 14, 30, 90] as const;

interface InspectorViewProps {
    attributesParam?: string;
    dateParam?: string;
    viewParam?: "daily";
    daysParam?: number;
}

export function InspectorView({ attributesParam, dateParam, viewParam, daysParam }: InspectorViewProps) {
    const { t } = useTranslation();
    const navigate = useNavigate({ from: "/analytics" });

    const [outOfRangeOpen, setOutOfRangeOpen] = useState(false);
    const isDailyView = viewParam === "daily";
    const days =
        daysParam && PERIOD_PRESETS.includes(daysParam as (typeof PERIOD_PRESETS)[number])
            ? daysParam
            : DEFAULT_DAYS;

    const selectedIds = useMemo(() => {
        if (!attributesParam) return [];
        return attributesParam
            .split(",")
            .map(Number)
            .filter((n) => !Number.isNaN(n) && n > 0);
    }, [attributesParam]);

    const today = format(new Date(), "yyyy-MM-dd");
    const date = dateParam || today;

    // Daily stats: `date` is the end of the range
    const dailyRange = useMemo(() => {
        const to = new Date(date);
        const from = subDays(to, days - 1);
        return { from: format(from, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") };
    }, [date, days]);

    function updateSearch(attrs: number[], d: string, view?: "daily", periodDays?: number) {
        navigate({
            search: {
                attributes: attrs.length > 0 ? attrs.join(",") : undefined,
                date: d !== today ? d : undefined,
                view,
                days: view === "daily" && periodDays && periodDays !== DEFAULT_DAYS ? periodDays : undefined,
            },
            replace: true,
        });
    }

    function handleSelectionChange(ids: number[]) {
        updateSearch(ids, date, isDailyView ? "daily" : undefined, days);
    }

    function toggleView() {
        updateSearch(selectedIds, date, isDailyView ? undefined : "daily", days);
    }

    function selectPeriod(preset: number) {
        updateSearch(selectedIds, date, "daily", preset);
    }

    // Intraday navigation
    function goToPrevDay() {
        updateSearch(selectedIds, format(subDays(new Date(date), 1), "yyyy-MM-dd"));
    }

    function goToNextDay() {
        updateSearch(selectedIds, format(addDays(new Date(date), 1), "yyyy-MM-dd"));
    }

    function handleDateChange(newDate: string) {
        updateSearch(selectedIds, newDate);
    }

    // Daily view navigation — shift by the period size
    function goToPrevPeriod() {
        updateSearch(selectedIds, format(subDays(new Date(date), days), "yyyy-MM-dd"), "daily", days);
    }

    function goToNextPeriod() {
        const next = addDays(new Date(date), days);
        const todayDate = new Date();
        // Don't go past today
        const clamped = next > todayDate ? todayDate : next;
        updateSearch(selectedIds, format(clamped, "yyyy-MM-dd"), "daily", days);
    }

    const isAtPresent = date === today;

    return (
        <>
            <PageHeader
                title={t("inspector.title")}
                actions={
                    <>
                        {selectedIds.length > 0 && (
                            <>
                                {/* View toggle */}
                                <button
                                    type="button"
                                    onClick={toggleView}
                                    title={
                                        isDailyView ? t("inspector.intradayView") : t("inspector.dailyView")
                                    }
                                    className="flex cursor-pointer items-center justify-center h-8 w-8 rounded-[min(var(--radius-md),10px)] border border-border bg-background shadow-xs dark:border-input dark:bg-input/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    {isDailyView ? (
                                        <LineChart className="h-3.5 w-3.5" />
                                    ) : (
                                        <BarChart3 className="h-3.5 w-3.5" />
                                    )}
                                </button>

                                {/* Date navigation — only for intraday view */}
                                {!isDailyView && (
                                    <div className="flex items-center h-8 rounded-[min(var(--radius-md),10px)] border border-border bg-background shadow-xs dark:border-input dark:bg-input/30 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={goToPrevDay}
                                            title={t("chart.previousDay")}
                                            className="flex items-center justify-center h-full w-8 text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-input/50 transition-colors cursor-pointer"
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
                                            disabled={isAtPresent}
                                            title={t("chart.nextDay")}
                                            className="flex items-center justify-center h-full w-8 text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-input/50 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )}

                                {/* Period navigation + presets — only for daily view */}
                                {isDailyView && (
                                    <div className="flex items-center h-8 rounded-[min(var(--radius-md),10px)] border border-border bg-background shadow-xs dark:border-input dark:bg-input/30 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={goToPrevPeriod}
                                            title={t("inspector.previousPeriod")}
                                            className="flex items-center justify-center h-full w-8 text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-input/50 transition-colors cursor-pointer"
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </button>
                                        <div className="w-px self-stretch bg-border dark:bg-input" />
                                        {PERIOD_PRESETS.map((preset, i) => (
                                            <span key={preset} className="contents">
                                                {i > 0 && (
                                                    <div className="w-px self-stretch bg-border dark:bg-input" />
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => selectPeriod(preset)}
                                                    className={`flex items-center justify-center h-full px-2.5 text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                                                        days === preset
                                                            ? "text-foreground bg-muted dark:bg-input/50 font-medium"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-input/50"
                                                    }`}
                                                >
                                                    {preset}d
                                                </button>
                                            </span>
                                        ))}
                                        <div className="w-px self-stretch bg-border dark:bg-input" />
                                        <button
                                            type="button"
                                            onClick={goToNextPeriod}
                                            disabled={isAtPresent}
                                            title={t("inspector.nextPeriod")}
                                            className="flex items-center justify-center h-full w-8 text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-input/50 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                        <AttributeSelector
                            selectedIds={selectedIds}
                            onSelectionChange={handleSelectionChange}
                        />
                    </>
                }
            />

            <PageContent className="flex flex-col">
                {selectedIds.length > 0 ? (
                    <div className="flex flex-col min-h-0 flex-1 animate-fade-in">
                        {isDailyView ? (
                            <DailyStatsChart
                                attributeIds={selectedIds}
                                dateFrom={dailyRange.from}
                                dateTo={dailyRange.to}
                                onDayClick={(d) => updateSearch(selectedIds, d)}
                            />
                        ) : (
                            <AttributeChart
                                attributeIds={selectedIds}
                                date={date}
                                onOutOfRangeClick={() => setOutOfRangeOpen(true)}
                            />
                        )}
                    </div>
                ) : (
                    <EmptyState
                        icon={isDailyView ? BarChart3 : LineChart}
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
            </PageContent>
            <OutOfRangeDateDialog
                attributeIds={selectedIds}
                date={date}
                open={outOfRangeOpen}
                onOpenChange={setOutOfRangeOpen}
            />
        </>
    );
}

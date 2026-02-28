import { useNavigate } from "@tanstack/react-router";
import { addDays, format, subDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AttributeChart } from "@/components/charts/attribute-chart";
import { AttributeSelector } from "@/components/inspector/attribute-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface InspectorViewProps {
    attributesParam?: string;
    dateParam?: string;
}

export function InspectorView({ attributesParam, dateParam }: InspectorViewProps) {
    const { t } = useTranslation();
    const navigate = useNavigate({ from: "/inspector" });

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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t("inspector.title")}</h1>
                <AttributeSelector selectedIds={selectedIds} onSelectionChange={handleSelectionChange} />
            </div>

            {selectedIds.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                        <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={goToPrevDay}
                            title={t("chart.previousDay")}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="rounded-md border border-input bg-background px-3 py-1 text-sm"
                        />
                        <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={goToNextDay}
                            title={t("chart.nextDay")}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <AttributeChart attributeIds={selectedIds} date={date} />
                </div>
            ) : (
                <Card>
                    <CardContent className="py-8 text-center">
                        <p className="font-medium">{t("inspector.noAttributes")}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t("inspector.noAttributesDescription")}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

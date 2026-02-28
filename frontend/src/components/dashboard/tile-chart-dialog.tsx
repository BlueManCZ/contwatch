import { Link } from "@tanstack/react-router";
import { addDays, format, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DashboardTile } from "@/api/generated/contWatchAPI.schemas";
import { AttributeChart } from "@/components/charts/attribute-chart";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TileChartDialogProps {
    tile: DashboardTile | null;
    onClose: () => void;
}

export function TileChartDialog({ tile, onClose }: TileChartDialogProps) {
    const { t } = useTranslation();
    const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

    const title = tile ? `${tile.label || tile.name}${tile.unit ? ` (${tile.unit})` : ""}` : "";

    function goToPrevDay() {
        setDate((d) => format(subDays(new Date(d), 1), "yyyy-MM-dd"));
    }

    function goToNextDay() {
        setDate((d) => format(addDays(new Date(d), 1), "yyyy-MM-dd"));
    }

    return (
        <Dialog
            open={tile !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

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
                        onChange={(e) => setDate(e.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-1 text-sm"
                    />
                    <Button variant="outline" size="icon-sm" onClick={goToNextDay} title={t("chart.nextDay")}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                {tile && <AttributeChart key={tile.id} attributeIds={[tile.attribute_id]} date={date} />}

                {tile && (
                    <div className="flex justify-end">
                        <Link
                            to="/inspector"
                            search={{ attributes: String(tile.attribute_id), date }}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={onClose}
                        >
                            <ExternalLink className="h-3 w-3" />
                            {t("chart.openInInspector")}
                        </Link>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

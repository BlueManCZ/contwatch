import { useQueryClient } from "@tanstack/react-query";
import { ScrollText, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { LoggingMessageRead } from "@/api/generated/contWatchAPI.schemas";
import { useClearLogsApiLogsDelete, useListLogsApiLogsGet } from "@/api/generated/logs/logs";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LEVEL_MAP: Record<number, string> = {
    10: "DEBUG",
    20: "INFO",
    30: "WARNING",
    40: "ERROR",
    50: "CRITICAL",
};

const LEVEL_OPTIONS = [
    { value: "", label: "allLevels" },
    { value: "10", label: "DEBUG" },
    { value: "20", label: "INFO" },
    { value: "30", label: "WARNING" },
    { value: "40", label: "ERROR" },
    { value: "50", label: "CRITICAL" },
] as const;

function getLevelVariant(level: number): "secondary" | "default" | "outline" | "destructive" {
    if (level >= 50) return "destructive";
    if (level >= 40) return "destructive";
    if (level >= 30) return "outline";
    if (level >= 20) return "default";
    return "secondary";
}

function getLevelName(level: number): string {
    return LEVEL_MAP[level] ?? `LEVEL ${level}`;
}

function formatTimestamp(timestamp: string, locale: string): string {
    return new Date(timestamp).toLocaleString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

export function LogViewer() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [level, setLevel] = useState<string>("");
    const [source, setSource] = useState("");
    const [confirmOpen, setConfirmOpen] = useState(false);

    const { data } = useListLogsApiLogsGet({
        level: level ? Number(level) : undefined,
    });

    const clearLogs = useClearLogsApiLogsDelete();

    const allLogs = (data?.data ?? []) as LoggingMessageRead[];
    const sources = useMemo(() => [...new Set(allLogs.map((l) => l.source))].sort(), [allLogs]);
    const logs = source ? allLogs.filter((l) => l.source === source) : allLogs;

    function handleClear() {
        clearLogs.mutate(undefined, {
            onSuccess: () => {
                queryClient.removeQueries({ queryKey: ["/api/logs/"] });
                setConfirmOpen(false);
                toast.success(t("toast.logsCleared"));
            },
        });
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("logs.title")}
                actions={
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmOpen(true)}
                        disabled={logs.length === 0}
                        className="text-muted-foreground hover:text-destructive-foreground"
                    >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        {t("logs.clear")}
                    </Button>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <Select value={level} onValueChange={(v) => setLevel(v ?? "")}>
                    <SelectTrigger className="w-40" size="sm">
                        <SelectValue placeholder={t("logs.allLevels")}>
                            {level ? LEVEL_MAP[Number(level)] : t("logs.allLevels")}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                        {LEVEL_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.value === "" ? t("logs.allLevels") : opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {sources.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {sources.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setSource(source === s ? "" : s)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                    source === s
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-accent"
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {logs.length === 0 ? (
                <EmptyState
                    icon={ScrollText}
                    title={t("logs.noLogs")}
                    description={t("logs.noLogsDescription")}
                />
            ) : (
                <>
                    {/* Mobile: stacked list */}
                    <div className="space-y-1.5 md:hidden">
                        {logs.map((log) => (
                            <LogCard key={log.id} log={log} />
                        ))}
                    </div>

                    {/* Desktop: table */}
                    <Card className="py-0 hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-44">{t("logs.time")}</TableHead>
                                    <TableHead className="w-24">{t("logs.level")}</TableHead>
                                    <TableHead className="w-32">{t("logs.source")}</TableHead>
                                    <TableHead>{t("logs.message")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <LogRow key={log.id} log={log} />
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </>
            )}

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("logs.clear")}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground py-4">{t("logs.clearConfirm")}</p>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleClear}
                            disabled={clearLogs.isPending}
                        >
                            {t("common.delete")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function LogCard({ log }: { log: LoggingMessageRead }) {
    const { i18n } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    return (
        <Card
            className={`px-3 py-2 gap-1${log.payload ? " cursor-pointer active:bg-accent/50" : ""}`}
            onClick={log.payload ? () => setExpanded(!expanded) : undefined}
        >
            <div className="flex items-center gap-2">
                <Badge
                    variant={getLevelVariant(log.level)}
                    className={`text-[10px] shrink-0${log.level >= 50 ? " font-bold" : ""}`}
                >
                    {getLevelName(log.level)}
                </Badge>
                <span className="text-[11px] font-mono text-muted-foreground">{log.source}</span>
                <span className="text-[11px] text-muted-foreground font-mono tabular-nums ml-auto">
                    {formatTimestamp(log.timestamp, i18n.language)}
                </span>
            </div>
            <p className="text-[13px] break-words">{log.message}</p>
            {expanded && log.payload && (
                <pre className="text-xs font-mono bg-muted/50 p-2.5 rounded-md overflow-x-auto mt-1.5">
                    {JSON.stringify(log.payload, null, 2)}
                </pre>
            )}
        </Card>
    );
}

function LogRow({ log }: { log: LoggingMessageRead }) {
    const { i18n } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <TableRow
                className={log.payload ? "cursor-pointer hover:bg-accent/50" : undefined}
                onClick={log.payload ? () => setExpanded(!expanded) : undefined}
            >
                <TableCell className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    {formatTimestamp(log.timestamp, i18n.language)}
                </TableCell>
                <TableCell>
                    <Badge
                        variant={getLevelVariant(log.level)}
                        className={`text-[10px] ${log.level >= 50 ? "font-bold" : ""}`}
                    >
                        {getLevelName(log.level)}
                    </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono">{log.source}</TableCell>
                <TableCell className="text-sm">{log.message}</TableCell>
            </TableRow>
            {expanded && log.payload && (
                <TableRow>
                    <TableCell colSpan={4}>
                        <pre className="text-xs font-mono bg-muted/50 p-3 rounded-md overflow-x-auto">
                            {JSON.stringify(log.payload, null, 2)}
                        </pre>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

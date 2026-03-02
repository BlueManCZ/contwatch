import { Code, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

interface ActionMessageEditorProps {
    value: string;
    onChange: (value: string) => void;
}

type Entry = { id: string; key: string; value: string };

function tryParseJson(s: string): Record<string, unknown> | null {
    try {
        const parsed = JSON.parse(s);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
        /* empty */
    }
    return null;
}

function isHttpFormat(obj: Record<string, unknown>): boolean {
    const keys = new Set(Object.keys(obj));
    return keys.has("method") || keys.has("path") || keys.has("params");
}

function useEntries(record: Record<string, string>) {
    const counterRef = useRef(0);
    const selfUpdateRef = useRef(false);
    const [entries, setEntries] = useState<Entry[]>(() =>
        Object.entries(record).map(([k, v]) => ({ id: `init-${counterRef.current++}`, key: k, value: v })),
    );

    // Sync from external value only — skip when the change originated locally
    const prevJsonRef = useRef(JSON.stringify(record));
    useEffect(() => {
        const json = JSON.stringify(record);
        if (json !== prevJsonRef.current) {
            prevJsonRef.current = json;
            if (selfUpdateRef.current) {
                selfUpdateRef.current = false;
                return;
            }
            setEntries(
                Object.entries(record).map(([k, v]) => ({
                    id: `ext-${counterRef.current++}`,
                    key: k,
                    value: v,
                })),
            );
        }
    }, [record]);

    function update(id: string, key: string, value: string) {
        selfUpdateRef.current = true;
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, key, value } : e)));
    }

    function remove(id: string) {
        selfUpdateRef.current = true;
        setEntries((prev) => prev.filter((e) => e.id !== id));
    }

    function add() {
        setEntries((prev) => [...prev, { id: `new-${counterRef.current++}`, key: "", value: "" }]);
    }

    return { entries, update, remove, add };
}

export function ActionMessageEditor({ value, onChange }: ActionMessageEditorProps) {
    const { t } = useTranslation();
    const [rawMode, setRawMode] = useState(false);

    const parsed = useMemo(() => tryParseJson(value), [value]);
    const httpMode = parsed !== null && isHttpFormat(parsed);

    const effectiveRaw = rawMode || parsed === null;

    if (effectiveRaw) {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label>{t("actions.message")}</Label>
                    {parsed !== null && (
                        <Toggle
                            pressed
                            size="sm"
                            onPressedChange={() => setRawMode(false)}
                            title={t("actions.rawJson")}
                        >
                            <Code className="h-3.5 w-3.5" />
                        </Toggle>
                    )}
                </div>
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    rows={4}
                    className="font-mono text-sm"
                    required
                />
            </div>
        );
    }

    if (httpMode) {
        return <HttpMessageEditor value={parsed} onChange={onChange} onToggleRaw={() => setRawMode(true)} />;
    }

    return <KeyValueEditor value={parsed} onChange={onChange} onToggleRaw={() => setRawMode(true)} />;
}

function HttpMessageEditor({
    value,
    onChange,
    onToggleRaw,
}: {
    value: Record<string, unknown>;
    onChange: (json: string) => void;
    onToggleRaw: () => void;
}) {
    const { t } = useTranslation();
    const method = (value.method as string) || "GET";
    const path = (value.path as string) || "";
    const params = (value.params as Record<string, string>) || {};

    function update(patch: Partial<{ method: string; path: string; params: Record<string, string> }>) {
        const next = { method, path, ...(Object.keys(params).length > 0 ? { params } : {}), ...patch };
        if (next.params && Object.keys(next.params).length === 0) {
            delete (next as Record<string, unknown>).params;
        }
        onChange(JSON.stringify(next));
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label>{t("actions.message")}</Label>
                <Toggle size="sm" onPressedChange={onToggleRaw} title={t("actions.rawJson")}>
                    <Code className="h-3.5 w-3.5" />
                </Toggle>
            </div>

            <div className="flex gap-2">
                <Select value={method} onValueChange={(v) => update({ method: v ?? "GET" })}>
                    <SelectTrigger className="w-[100px] text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                        {HTTP_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                                {m}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input
                    value={path}
                    onChange={(e) => update({ path: e.target.value })}
                    placeholder="/relay/0"
                    className="text-sm font-mono flex-1"
                />
            </div>

            <ParamsEditor
                params={params}
                onChange={(p) => update({ params: p })}
                label={t("actions.params")}
            />
        </div>
    );
}

function ParamsEditor({
    params,
    onChange,
    label,
}: {
    params: Record<string, string>;
    onChange: (params: Record<string, string>) => void;
    label: string;
}) {
    const { t } = useTranslation();
    const { entries, update, remove, add } = useEntries(params);

    function handleUpdate(id: string, key: string, value: string) {
        update(id, key, value);
        // Defer onChange to let state settle — compute from new entries
        const updated = entries.map((e) => (e.id === id ? { ...e, key, value } : e));
        const obj: Record<string, string> = {};
        for (const e of updated) {
            if (e.key) obj[e.key] = e.value;
        }
        onChange(obj);
    }

    function handleRemove(id: string) {
        remove(id);
        const obj: Record<string, string> = {};
        for (const e of entries) {
            if (e.id !== id && e.key) obj[e.key] = e.value;
        }
        onChange(obj);
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Button type="button" variant="ghost" size="icon-xs" onClick={add}>
                    <Plus className="h-3 w-3" />
                </Button>
            </div>
            {entries.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">{t("actions.noParams")}</p>
            ) : (
                <div className="space-y-1.5">
                    {entries.map((entry) => (
                        <div key={entry.id} className="flex items-center gap-1.5">
                            <Input
                                value={entry.key}
                                onChange={(e) => handleUpdate(entry.id, e.target.value, entry.value)}
                                placeholder={t("actions.paramKey")}
                                className="h-7 text-xs font-mono flex-1"
                            />
                            <span className="text-muted-foreground text-xs">=</span>
                            <Input
                                value={entry.value}
                                onChange={(e) => handleUpdate(entry.id, entry.key, e.target.value)}
                                placeholder={t("actions.paramValue")}
                                className="h-7 text-xs font-mono flex-1"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handleRemove(entry.id)}
                                className="text-muted-foreground hover:text-destructive shrink-0"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function KeyValueEditor({
    value,
    onChange,
    onToggleRaw,
}: {
    value: Record<string, unknown>;
    onChange: (json: string) => void;
    onToggleRaw: () => void;
}) {
    const { t } = useTranslation();
    const record = useMemo(() => {
        const r: Record<string, string> = {};
        for (const [k, v] of Object.entries(value)) r[k] = String(v);
        return r;
    }, [value]);

    const { entries, update, remove, add } = useEntries(record);

    function commit(updated: Entry[]) {
        const obj: Record<string, string> = {};
        for (const e of updated) {
            if (e.key) obj[e.key] = e.value;
        }
        onChange(JSON.stringify(obj));
    }

    function handleUpdate(id: string, key: string, val: string) {
        update(id, key, val);
        commit(entries.map((e) => (e.id === id ? { ...e, key, value: val } : e)));
    }

    function handleRemove(id: string) {
        remove(id);
        commit(entries.filter((e) => e.id !== id));
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label>{t("actions.message")}</Label>
                <Toggle size="sm" onPressedChange={onToggleRaw} title={t("actions.rawJson")}>
                    <Code className="h-3.5 w-3.5" />
                </Toggle>
            </div>
            {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-1.5">
                    <Input
                        value={entry.key}
                        onChange={(e) => handleUpdate(entry.id, e.target.value, entry.value)}
                        placeholder={t("actions.paramKey")}
                        className="h-8 text-xs font-mono w-1/3"
                    />
                    <span className="text-muted-foreground text-xs">=</span>
                    <Input
                        value={entry.value}
                        onChange={(e) => handleUpdate(entry.id, entry.key, e.target.value)}
                        placeholder={t("actions.paramValue")}
                        className="h-8 text-xs font-mono flex-1"
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemove(entry.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="xs" onClick={add} className="w-full">
                <Plus className="h-3 w-3 mr-1" />
                {t("actions.addField")}
            </Button>
        </div>
    );
}

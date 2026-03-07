import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { PortOption } from "@/api/generated/contWatchAPI.schemas";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TreeNode {
    label: string;
    value: string;
    displayLabel: string;
    children: TreeNode[];
}

function buildTree(options: PortOption[]): TreeNode[] {
    const root: TreeNode[] = [];

    for (const option of options) {
        const segments = option.value.split("/");
        let level = root;

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            let existing = level.find((n) => n.label === segment);
            if (!existing) {
                existing = { label: segment, value: option.value, displayLabel: "", children: [] };
                level.push(existing);
            }
            if (i < segments.length - 1) {
                level = existing.children;
            } else {
                existing.value = option.value;
                existing.displayLabel = option.display_label ?? "";
            }
        }
    }

    return root;
}

function TreeMenuItems({ nodes, onSelect }: { nodes: TreeNode[]; onSelect: (value: string) => void }) {
    const { t, i18n } = useTranslation();

    function localizeLeaf(node: TreeNode): string {
        if (node.displayLabel) return `${node.displayLabel} (${node.label})`;
        const i18nKey = `knownAttributes.${node.value.replace(/[/:]/g, "_")}`;
        if (i18n.exists(i18nKey)) {
            const localized = String(t(i18nKey));
            if (localized !== node.label) return `${localized} (${node.label})`;
        }
        return node.label;
    }

    return (
        <>
            {nodes.map((node) => {
                if (node.children.length === 0) {
                    return (
                        <DropdownMenuItem
                            key={node.value}
                            className="text-xs font-mono"
                            onClick={() => onSelect(node.value)}
                        >
                            {localizeLeaf(node)}
                        </DropdownMenuItem>
                    );
                }
                return (
                    <DropdownMenuSub key={node.label}>
                        <DropdownMenuSubTrigger className="text-xs font-mono">
                            {node.label}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <TreeMenuItems nodes={node.children} onSelect={onSelect} />
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                );
            })}
        </>
    );
}

export function TreeSelectControl({
    options,
    value,
    onChange,
    disabled,
    filterPrefix,
}: {
    options: PortOption[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    filterPrefix?: string;
}) {
    const { t, i18n } = useTranslation();
    const filtered = useMemo(() => {
        if (!filterPrefix) return options;
        return options.filter((o) => o.group === filterPrefix);
    }, [options, filterPrefix]);
    const tree = useMemo(() => buildTree(filtered), [filtered]);

    const displayValue = useMemo(() => {
        if (!value) return "—";
        const match = filtered.find((o) => o.value === value);
        if (match?.display_label) return match.display_label;
        const i18nKey = `knownAttributes.${value.replace(/[/:]/g, "_")}`;
        return i18n.exists(i18nKey) ? String(t(i18nKey)) : value;
    }, [value, filtered, t, i18n]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                disabled={disabled}
                render={
                    <button
                        type="button"
                        className={`nodrag relative w-full cursor-pointer ${disabled ? "opacity-50" : ""}`}
                    >
                        <select
                            className="w-full rounded border border-input bg-card text-card-foreground px-2 py-1 text-xs font-mono pointer-events-none"
                            tabIndex={-1}
                            value=""
                            onChange={() => {}}
                        >
                            <option value="">{displayValue}</option>
                        </select>
                    </button>
                }
            />
            <DropdownMenuContent align="start" sideOffset={4} className="max-h-64 overflow-y-auto">
                {tree.length === 0 ? (
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                        No keys available
                    </DropdownMenuItem>
                ) : (
                    <TreeMenuItems nodes={tree} onSelect={onChange} />
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

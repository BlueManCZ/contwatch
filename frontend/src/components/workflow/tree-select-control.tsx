import { useMemo } from "react";
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
                existing = { label: segment, value: option.value, children: [] };
                level.push(existing);
            }
            if (i < segments.length - 1) {
                level = existing.children;
            } else {
                existing.value = option.value;
            }
        }
    }

    return root;
}

function TreeMenuItems({ nodes, onSelect }: { nodes: TreeNode[]; onSelect: (value: string) => void }) {
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
                            {node.label}
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
    const filtered = useMemo(() => {
        if (!filterPrefix) return options;
        return options.filter((o) => o.group === filterPrefix);
    }, [options, filterPrefix]);
    const tree = useMemo(() => buildTree(filtered), [filtered]);

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
                            <option value="">{value || "—"}</option>
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

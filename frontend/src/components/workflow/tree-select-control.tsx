import { useMemo } from "react";
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
    fullPath: string;
    children: TreeNode[];
}

function buildTree(options: string[]): TreeNode[] {
    const root: TreeNode[] = [];

    for (const option of options) {
        const segments = option.split("/");
        let level = root;

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            let existing = level.find((n) => n.label === segment);
            if (!existing) {
                existing = { label: segment, fullPath: option, children: [] };
                level.push(existing);
            }
            if (i < segments.length - 1) {
                level = existing.children;
            } else {
                existing.fullPath = option;
            }
        }
    }

    return root;
}

function TreeMenuItems({ nodes, onSelect }: { nodes: TreeNode[]; onSelect: (fullPath: string) => void }) {
    return (
        <>
            {nodes.map((node) => {
                if (node.children.length === 0) {
                    return (
                        <DropdownMenuItem
                            key={node.fullPath}
                            className="text-xs font-mono"
                            onClick={() => onSelect(node.fullPath)}
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
    placeholder,
    disabled,
    filterPrefix,
}: {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    filterPrefix?: string;
}) {
    const filtered = useMemo(() => {
        if (!filterPrefix) return options;
        const prefix = `${filterPrefix}:`;
        return options.filter((o) => o.startsWith(prefix)).map((o) => o.slice(prefix.length));
    }, [options, filterPrefix]);
    const tree = useMemo(() => buildTree(filtered), [filtered]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                disabled={disabled}
                render={
                    <button
                        type="button"
                        className={`nodrag w-full rounded border border-input bg-card text-card-foreground px-2 py-1 text-xs font-mono text-left truncate ${disabled ? "opacity-50" : ""}`}
                    >
                        {value || placeholder || "—"}
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

import { useTranslation } from "react-i18next";
import type { NodeDefinition } from "./types";

interface NodePaletteProps {
    definitions: NodeDefinition[];
    onAddNode: (type: string) => void;
}

export function NodePalette({ definitions, onAddNode }: NodePaletteProps) {
    const { t } = useTranslation();

    function handleDragStart(event: React.DragEvent, nodeType: string) {
        event.dataTransfer.setData("application/reactflow", nodeType);
        event.dataTransfer.effectAllowed = "move";
    }

    return (
        <div className="w-52 shrink-0 overflow-y-auto border-r border-border bg-muted/30 p-3">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{t("workflow.nodeTypes")}</h3>
            <div className="space-y-1.5">
                {definitions.map((def) => (
                    <button
                        key={def.type}
                        type="button"
                        className="w-full rounded-md border border-border bg-card px-3 py-2 text-left text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent cursor-grab active:cursor-grabbing"
                        draggable
                        onDragStart={(e) => handleDragStart(e, def.type)}
                        onClick={() => onAddNode(def.type)}
                        title={def.description}
                    >
                        {def.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

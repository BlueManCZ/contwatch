import { Blocks } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { NodeDefinition } from "./types";

interface NodePaletteProps {
    definitions: NodeDefinition[];
    onAddNode: (type: string) => void;
}

function PaletteItems({
    definitions,
    onAddNode,
    onDragStart,
}: {
    definitions: NodeDefinition[];
    onAddNode: (type: string) => void;
    onDragStart: (event: React.DragEvent, nodeType: string) => void;
}) {
    return (
        <div className="space-y-1.5">
            {definitions.map((def) => (
                <button
                    key={def.type}
                    type="button"
                    className="w-full rounded-md border bg-card px-3 py-2 text-left text-xs font-medium shadow-sm transition-all hover:bg-accent hover:border-primary/30 cursor-grab active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => onDragStart(e, def.type)}
                    onClick={() => onAddNode(def.type)}
                    title={def.description}
                >
                    {def.label}
                </button>
            ))}
        </div>
    );
}

export function NodePaletteSheet({ definitions, onAddNode }: NodePaletteProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    function handleDragStart(event: React.DragEvent, nodeType: string) {
        event.dataTransfer.setData("application/reactflow", nodeType);
        event.dataTransfer.effectAllowed = "move";
    }

    function handleAddNode(type: string) {
        onAddNode(type);
        setOpen(false);
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
                render={
                    <Button variant="outline" size="sm">
                        <Blocks className="mr-1.5 h-3.5 w-3.5" />
                        {t("workflow.nodeTypes")}
                    </Button>
                }
            />
            <SheetContent side="bottom" className="max-h-[60vh]">
                <SheetHeader>
                    <SheetTitle>{t("workflow.nodeTypes")}</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto p-4">
                    <PaletteItems
                        definitions={definitions}
                        onAddNode={handleAddNode}
                        onDragStart={handleDragStart}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}

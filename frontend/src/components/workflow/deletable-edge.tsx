import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getBezierPath, useReactFlow } from "@xyflow/react";
import { X } from "lucide-react";
import { type EdgeKey, edgeKey, useWorkflowStore } from "@/stores/workflow-store";

export function DeletableEdge({
    id,
    source,
    sourceHandleId,
    target,
    targetHandleId,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    selected,
}: EdgeProps) {
    const { deleteElements } = useReactFlow();
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const key: EdgeKey = edgeKey(source, sourceHandleId ?? "", target, targetHandleId ?? "");
    const edgeDebug = useWorkflowStore((s) => s.edgeDebug);
    const displayValue = useWorkflowStore((s) => (edgeDebug ? s.edgeValues[key] : undefined));

    return (
        <>
            <BaseEdge id={id} path={edgePath} style={style} />
            <EdgeLabelRenderer>
                {selected && (
                    <button
                        type="button"
                        className="nopan nodrag absolute flex h-5 w-5 items-center justify-center rounded-full cursor-pointer border-2 border-primary bg-card text-primary shadow-sm transition-colors hover:bg-destructive hover:border-destructive hover:text-destructive-foreground"
                        style={{
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            pointerEvents: "all",
                        }}
                        onClick={() => deleteElements({ edges: [{ id }] })}
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
                {!selected && displayValue && (
                    <div
                        className="nopan nodrag absolute flex items-baseline rounded-md border bg-card/90 backdrop-blur-sm px-2 pt-1 pb-1.5 shadow-sm"
                        style={{
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            pointerEvents: "none",
                        }}
                    >
                        <span className="text-xs font-semibold font-mono leading-none">
                            {displayValue.value}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1 leading-none">
                            {displayValue.type}
                        </span>
                    </div>
                )}
            </EdgeLabelRenderer>
        </>
    );
}

import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getBezierPath, useReactFlow } from "@xyflow/react";
import { X } from "lucide-react";

export function DeletableEdge({
    id,
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

    return (
        <>
            <BaseEdge id={id} path={edgePath} style={style} />
            {selected && (
                <EdgeLabelRenderer>
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
                </EdgeLabelRenderer>
            )}
        </>
    );
}

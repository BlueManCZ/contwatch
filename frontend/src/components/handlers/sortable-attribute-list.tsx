import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type ReactNode, useId, useRef, useState } from "react";

interface SortableAttributeListProps<T extends { id: number }> {
    items: T[];
    renderItem: (item: T, isDragging: boolean) => ReactNode;
    onReorder: (items: T[]) => void;
    onLongPress?: (item: T) => void;
}

const DRAG_TOLERANCE = 8;

export function SortableAttributeList<T extends { id: number }>({
    items,
    renderItem,
    onReorder,
    onLongPress,
}: SortableAttributeListProps<T>) {
    const dndId = useId();
    // Only track item ORDER locally (for drag-and-drop); actual item DATA always comes from props.
    const [localOrder, setLocalOrder] = useState<number[]>(() => items.map((i) => i.id));
    const isLocalReorder = useRef(false);

    const propIds = items.map((i) => i.id).join(",");
    const localIds = localOrder.join(",");
    if (propIds !== localIds) {
        if (!isLocalReorder.current) {
            setLocalOrder(items.map((i) => i.id));
        }
    } else {
        isLocalReorder.current = false;
    }

    // Build display list: always use fresh data from props, arranged in local order
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const displayItems = localOrder.map((id) => itemMap.get(id)).filter((i): i is T => i != null);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: DRAG_TOLERANCE } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: DRAG_TOLERANCE } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    function handleReorder(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = localOrder.indexOf(Number(active.id));
        const newIndex = localOrder.indexOf(Number(over.id));
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(localOrder, oldIndex, newIndex);
        isLocalReorder.current = true;
        setLocalOrder(reordered);

        const reorderedItems = reordered.map((id) => itemMap.get(id)).filter((i): i is T => i != null);
        onReorder(reorderedItems);
    }

    function triggerLongPress(activeId: string | number) {
        if (!onLongPress) return;
        const item = itemMap.get(Number(activeId));
        if (item) onLongPress(item);
    }

    const [dragging, setDragging] = useState(false);
    const wasMoved = useRef(false);

    return (
        <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragStart={() => {
                setDragging(true);
                wasMoved.current = false;
            }}
            onDragMove={(e) => {
                if (Math.abs(e.delta.x) > DRAG_TOLERANCE || Math.abs(e.delta.y) > DRAG_TOLERANCE) {
                    wasMoved.current = true;
                }
            }}
            onDragEnd={(e) => {
                setDragging(false);
                const { active, over } = e;
                if (over && active.id !== over.id) {
                    handleReorder(e);
                } else if (!wasMoved.current) {
                    triggerLongPress(active.id);
                }
            }}
            onDragCancel={(e) => {
                setDragging(false);
                if (!wasMoved.current) {
                    triggerLongPress(e.active.id);
                }
            }}
        >
            <SortableContext items={localOrder} strategy={verticalListSortingStrategy}>
                {displayItems.map((item) => (
                    <SortableItem
                        key={item.id}
                        id={item.id}
                        renderItem={renderItem}
                        item={item}
                        dragging={dragging}
                    />
                ))}
            </SortableContext>
        </DndContext>
    );
}

function SortableItem<T extends { id: number }>({
    id,
    item,
    renderItem,
    dragging,
}: {
    id: number;
    item: T;
    renderItem: (item: T, isDragging: boolean) => ReactNode;
    dragging: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
        animateLayoutChanges: () => false,
    });

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition,
        touchAction: "manipulation",
        zIndex: isDragging ? 10 : undefined,
        position: isDragging ? "relative" : undefined,
        pointerEvents: dragging && !isDragging ? "none" : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`select-none ${isDragging ? "outline-2 outline-dashed outline-primary/50 -outline-offset-2 rounded-xl bg-background" : ""}`}
            {...attributes}
            {...listeners}
        >
            {renderItem(item, isDragging)}
        </div>
    );
}

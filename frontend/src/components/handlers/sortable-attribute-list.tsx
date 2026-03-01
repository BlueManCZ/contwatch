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
    const [localItems, setLocalItems] = useState(items);
    const isLocalReorder = useRef(false);

    const propIds = items.map((i) => i.id).join(",");
    const localIds = localItems.map((i) => i.id).join(",");
    if (propIds !== localIds) {
        if (!isLocalReorder.current) {
            setLocalItems(items);
        }
    } else {
        isLocalReorder.current = false;
    }

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: DRAG_TOLERANCE } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: DRAG_TOLERANCE } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    function handleReorder(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = localItems.findIndex((i) => i.id === active.id);
        const newIndex = localItems.findIndex((i) => i.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(localItems, oldIndex, newIndex);
        isLocalReorder.current = true;
        setLocalItems(reordered);
        onReorder(reordered);
    }

    function triggerLongPress(activeId: string | number) {
        if (!onLongPress) return;
        const item = localItems.find((i) => i.id === activeId);
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
            <SortableContext items={localItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {localItems.map((item) => (
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
        transform: CSS.Transform.toString(transform),
        transition,
        pointerEvents: dragging && !isDragging ? "none" : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {renderItem(item, isDragging)}
        </div>
    );
}

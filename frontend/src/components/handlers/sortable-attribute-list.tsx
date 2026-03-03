import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    type DragOverEvent,
    DragOverlay,
    type DragStartEvent,
    type DroppableContainer,
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
    type SortingStrategy,
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
    /** Use DragOverlay + live reorder for CSS columns layouts. */
    multiColumn?: boolean;
}

const DRAG_TOLERANCE = 8;

/** No-op: let CSS columns handle positioning via live DOM reorder. */
const columnsStrategy: SortingStrategy = () => null;

/**
 * Only report a collision when the pointer is inside a droppable's rect.
 * Prevents false swaps after CSS columns reflow.
 */
function pointerWithinCollision({
    droppableContainers,
    pointerCoordinates,
}: {
    droppableContainers: DroppableContainer[];
    pointerCoordinates: { x: number; y: number } | null;
}) {
    if (!pointerCoordinates) return [];
    const { x, y } = pointerCoordinates;
    return droppableContainers
        .filter((container) => {
            const rect = container.rect.current;
            if (!rect) return false;
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        })
        .map((container) => ({ id: container.id, data: { droppableContainer: container, value: 0 } }));
}

export function SortableAttributeList<T extends { id: number }>({
    items,
    renderItem,
    onReorder,
    onLongPress,
    multiColumn,
}: SortableAttributeListProps<T>) {
    const dndId = useId();
    const [localOrder, setLocalOrder] = useState<number[]>(() => items.map((i) => i.id));
    const isLocalReorder = useRef(false);
    const [activeId, setActiveId] = useState<number | null>(null);
    const didReorder = useRef(false);
    const wasMoved = useRef(false);
    const reorderLock = useRef(false);

    const propIds = items.map((i) => i.id).join(",");
    const localIds = localOrder.join(",");
    if (propIds !== localIds) {
        if (!isLocalReorder.current) {
            setLocalOrder(items.map((i) => i.id));
        }
    } else {
        isLocalReorder.current = false;
    }

    const itemMap = new Map(items.map((i) => [i.id, i]));
    const displayItems = localOrder.map((id) => itemMap.get(id)).filter((i): i is T => i != null);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: DRAG_TOLERANCE } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: DRAG_TOLERANCE } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    function triggerLongPress(id: string | number) {
        if (!onLongPress) return;
        const item = itemMap.get(Number(id));
        if (item) onLongPress(item);
    }

    function handleDragStart(e: DragStartEvent) {
        setActiveId(Number(e.active.id));
        wasMoved.current = false;
        didReorder.current = false;
        reorderLock.current = false;
    }

    function handleDragOver(e: DragOverEvent) {
        if (!multiColumn || reorderLock.current) return;
        const { active, over } = e;
        if (!over || active.id === over.id) return;

        const oldIdx = localOrder.indexOf(Number(active.id));
        const newIdx = localOrder.indexOf(Number(over.id));
        if (oldIdx === -1 || newIdx === -1) return;

        reorderLock.current = true;
        isLocalReorder.current = true;
        didReorder.current = true;
        setLocalOrder(arrayMove(localOrder, oldIdx, newIdx));

        // Unlock after React render + CSS columns reflow + paint
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                reorderLock.current = false;
            });
        });
    }

    function handleDragEnd(e: DragEndEvent) {
        setActiveId(null);
        const { active, over } = e;

        if (multiColumn) {
            if (didReorder.current) {
                const reordered = localOrder.map((id) => itemMap.get(id)).filter((i): i is T => i != null);
                onReorder(reordered);
            } else if (!wasMoved.current) {
                triggerLongPress(active.id);
            }
        } else {
            if (over && active.id !== over.id) {
                const oldIdx = localOrder.indexOf(Number(active.id));
                const newIdx = localOrder.indexOf(Number(over.id));
                if (oldIdx !== -1 && newIdx !== -1) {
                    const reordered = arrayMove(localOrder, oldIdx, newIdx);
                    isLocalReorder.current = true;
                    setLocalOrder(reordered);
                    onReorder(reordered.map((id) => itemMap.get(id)).filter((i): i is T => i != null));
                }
            } else if (!wasMoved.current) {
                triggerLongPress(active.id);
            }
        }
    }

    function handleDragCancel() {
        setActiveId(null);
        isLocalReorder.current = false;
        setLocalOrder(items.map((i) => i.id));
    }

    const activeItem = activeId != null ? itemMap.get(activeId) : null;

    return (
        <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={multiColumn ? pointerWithinCollision : closestCenter}
            modifiers={multiColumn ? [] : [restrictToVerticalAxis, restrictToParentElement]}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragMove={(e) => {
                if (Math.abs(e.delta.x) > DRAG_TOLERANCE || Math.abs(e.delta.y) > DRAG_TOLERANCE) {
                    wasMoved.current = true;
                }
            }}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
        >
            <SortableContext
                items={localOrder}
                strategy={multiColumn ? columnsStrategy : verticalListSortingStrategy}
            >
                {displayItems.map((item) => (
                    <SortableItem
                        key={item.id}
                        id={item.id}
                        renderItem={renderItem}
                        item={item}
                        dragging={activeId != null}
                        useOverlay={multiColumn}
                    />
                ))}
            </SortableContext>

            {multiColumn && (
                <DragOverlay dropAnimation={null}>
                    {activeItem ? renderItem(activeItem, true) : null}
                </DragOverlay>
            )}
        </DndContext>
    );
}

function SortableItem<T extends { id: number }>({
    id,
    item,
    renderItem,
    dragging,
    useOverlay,
}: {
    id: number;
    item: T;
    renderItem: (item: T, isDragging: boolean) => ReactNode;
    dragging: boolean;
    useOverlay?: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
        animateLayoutChanges: () => false,
    });

    const style: React.CSSProperties = useOverlay
        ? {
              touchAction: "manipulation",
              opacity: isDragging ? 0.3 : undefined,
              pointerEvents: dragging && !isDragging ? "none" : undefined,
          }
        : {
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
            className={`select-none ${
                isDragging && !useOverlay
                    ? "outline-2 outline-dashed outline-primary/50 -outline-offset-2 rounded-xl bg-background"
                    : ""
            } ${isDragging && useOverlay ? "outline-2 outline-dashed outline-primary/30 -outline-offset-2 rounded-xl" : ""}`}
            {...attributes}
            {...listeners}
        >
            {renderItem(item, isDragging)}
        </div>
    );
}

import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    type DragOverEvent,
    DragOverlay,
    type DragStartEvent,
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
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";

interface SortableListProps<T extends { id: number }> {
    items: T[];
    renderItem: (item: T, isDragging: boolean) => ReactNode;
    onReorder: (items: T[]) => void;
    onLongPress?: (item: T) => void;
    onItemClick?: (item: T) => void;
    /** Use DragOverlay + live reorder for CSS columns layouts. */
    multiColumn?: boolean;
}

const DRAG_TOLERANCE = 8;

/** No-op: let CSS columns handle positioning via live DOM reorder. */
const columnsStrategy: SortingStrategy = () => null;

export function SortableList<T extends { id: number }>({
    items,
    renderItem,
    onReorder,
    onLongPress,
    onItemClick,
    multiColumn,
}: SortableListProps<T>) {
    const dndId = useId();
    const [localOrder, setLocalOrder] = useState<number[]>(() => items.map((i) => i.id));
    const isLocalReorder = useRef(false);
    const [activeId, setActiveId] = useState<number | null>(null);
    const didReorder = useRef(false);
    const wasMoved = useRef(false);
    const reorderLock = useRef(false);

    const propIds = useMemo(() => items.map((i) => i.id), [items]);
    useEffect(() => {
        if (!isLocalReorder.current) {
            setLocalOrder(propIds);
        } else {
            isLocalReorder.current = false;
        }
    }, [propIds]);

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

        // Lock long enough for React render + CSS columns reflow + paint
        // to prevent a second swap from firing on stale rects
        setTimeout(() => {
            reorderLock.current = false;
        }, 250);
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
        setLocalOrder(propIds);
    }

    const activeItem = activeId != null ? itemMap.get(activeId) : null;

    return (
        <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
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
                        onItemClick={onItemClick ? () => onItemClick(item) : undefined}
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
    onItemClick,
}: {
    id: number;
    item: T;
    renderItem: (item: T, isDragging: boolean) => ReactNode;
    dragging: boolean;
    useOverlay?: boolean;
    onItemClick?: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
        animateLayoutChanges: () => false,
    });
    const clickPosRef = useRef<{ x: number; y: number } | null>(null);

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
        // biome-ignore lint/a11y/noStaticElementInteractions: role is provided by dnd-kit attributes spread
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
            onPointerDown={(e) => {
                clickPosRef.current = { x: e.clientX, y: e.clientY };
                listeners?.onPointerDown?.(e);
            }}
            onClick={(e) => {
                if (!onItemClick || !clickPosRef.current) return;
                const dx = Math.abs(e.clientX - clickPosRef.current.x);
                const dy = Math.abs(e.clientY - clickPosRef.current.y);
                if (dx < DRAG_TOLERANCE && dy < DRAG_TOLERANCE) {
                    onItemClick();
                }
                clickPosRef.current = null;
            }}
            onKeyDown={(e) => {
                if (onItemClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onItemClick();
                }
            }}
        >
            {renderItem(item, isDragging)}
        </div>
    );
}

import type { Node } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

const LONG_PRESS_MS = 500;
const MOVE_THRESHOLD_PX = 10;
const DOUBLE_TAP_MS = 300;

/** Walk up the DOM to find the nearest ReactFlow node wrapper and return its id. */
function findNodeId(target: EventTarget | null): string | null {
    let el = target as HTMLElement | null;
    while (el) {
        if (el.classList?.contains("react-flow__node")) {
            return el.getAttribute("data-id");
        }
        el = el.parentElement;
    }
    return null;
}

/** Check whether the touch target is a connection handle (must let through for connections). */
function isOnHandle(target: EventTarget | null): boolean {
    let el = target as HTMLElement | null;
    while (el) {
        if (el.classList?.contains("react-flow__handle")) return true;
        if (el.classList?.contains("react-flow__node")) return false;
        el = el.parentElement;
    }
    return false;
}

/** Check whether the touch target is an interactive form element that needs native events. */
function isInteractiveElement(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "LABEL";
}

interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

interface ReactFlowLike {
    getViewport: () => Viewport;
    setViewport: (vp: Viewport) => void;
}

/**
 * Combined touch interaction hook for the workflow canvas.
 *
 * Touch behaviour on nodes (does NOT affect mouse/desktop):
 *
 * | Gesture                    | Action                         |
 * |----------------------------|--------------------------------|
 * | Quick tap                  | Select node (+ double-tap)     |
 * | Short drag                 | Pan the viewport               |
 * | Long-press (~500 ms) + lift| Enter multi-select mode        |
 * | Long-press + drag          | Move the node                  |
 * | Two-finger pinch / pan     | Zoom / pan (even over nodes)   |
 *
 * Touches on `.nodrag` elements (handles, form controls) pass through
 * unmodified so connections and controls keep working.
 */
export function useTouchMultiSelect(
    wrapperRef: React.RefObject<HTMLElement | null>,
    setNodes: (updater: (nodes: Node[]) => Node[]) => void,
    reactFlowInstance: ReactFlowLike | null,
    reportChange?: () => void,
    zoomLimits?: { min: number; max: number } | undefined,
) {
    // --- Multi-select state ---
    const [active, setActive] = useState(false);
    const activeRef = useRef(false);
    activeRef.current = active;

    const activateMultiSelect = useCallback(
        (nodeId: string) => {
            navigator.vibrate?.(50);
            setActive(true);
            setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
        },
        [setNodes],
    );

    const deactivateMultiSelect = useCallback(() => {
        setActive(false);
        setNodes((nds) => {
            if (nds.some((n) => n.selected)) {
                return nds.map((n) => (n.selected ? { ...n, selected: false } : n));
            }
            return nds;
        });
    }, [setNodes]);

    const toggleNode = useCallback(
        (nodeId: string) => {
            navigator.vibrate?.(30);
            setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, selected: !n.selected } : n)));
        },
        [setNodes],
    );

    // Stable refs so the effect closure always sees the latest values
    const rfRef = useRef(reactFlowInstance);
    rfRef.current = reactFlowInstance;
    const reportChangeRef = useRef(reportChange);
    reportChangeRef.current = reportChange;
    const zoomLimitsRef = useRef(zoomLimits);
    zoomLimitsRef.current = zoomLimits;

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        // Guard to skip our own synthetic events
        let isSynthetic = false;

        // ---- State machine ----
        // idle        – no active gesture on a node
        // pending     – touch started on node body, waiting for intent
        // panning     – forwarding to d3-zoom on the pane
        // longPressed – long-press fired, waiting for drag or lift
        // nodeDrag    – dragging node after long-press
        // pinching    – two-finger zoom / pan
        type State = "idle" | "pending" | "panning" | "longPressed" | "nodeDrag" | "pinching";
        let state: State = "idle";

        // Long-press timer
        let lpTimer: ReturnType<typeof setTimeout> | undefined;

        // Tracked touch that started on a node
        let touchNodeId: string | null = null;
        let touchStart: { x: number; y: number } | null = null;
        let lastPos: { x: number; y: number } | null = null;
        let touchTarget: HTMLElement | null = null; // original element touched
        let touchOnInteractive = false; // touch started on a form control

        // Pinch state
        let lastA: { x: number; y: number } | null = null;
        let lastB: { x: number; y: number } | null = null;
        const touchesOnNode = new Set<number>();

        // Double-tap detection
        let lastTapTime = 0;
        let lastTapNodeId: string | null = null;

        // Node IDs being dragged (single node or whole selection)
        const dragNodeIds = new Set<string>();

        function reset() {
            clearTimeout(lpTimer);
            lpTimer = undefined;
            state = "idle";
            touchNodeId = null;
            touchStart = null;
            lastPos = null;
            touchTarget = null;
            touchOnInteractive = false;
            dragNodeIds.clear();
        }

        // ---- Helpers for forwarding events to d3-zoom ----
        // d3-zoom is attached to .react-flow__renderer, NOT .react-flow__pane
        function getZoomElement(): HTMLElement | null {
            return el?.querySelector(".react-flow__renderer") as HTMLElement | null;
        }

        function makeSyntheticTouch(t: Touch, target: EventTarget): Touch {
            return new Touch({
                identifier: t.identifier,
                target,
                clientX: t.clientX,
                clientY: t.clientY,
                pageX: t.pageX,
                pageY: t.pageY,
                screenX: t.screenX,
                screenY: t.screenY,
            });
        }

        function forwardToPaneAs(type: string, e: TouchEvent) {
            const pane = getZoomElement();
            if (!pane) return;

            const touches = Array.from(e.touches, (t) => makeSyntheticTouch(t, pane));
            const changed = Array.from(e.changedTouches, (t) => makeSyntheticTouch(t, pane));

            isSynthetic = true;
            pane.dispatchEvent(
                new TouchEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    touches,
                    changedTouches: changed,
                    targetTouches: touches,
                }),
            );
            isSynthetic = false;
        }

        // ---------------------------------------------------------------
        //  touchstart  (capture phase)
        // ---------------------------------------------------------------
        function onTouchStart(e: TouchEvent) {
            if (isSynthetic) return;

            // Track which touches land on nodes
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (findNodeId(e.target)) {
                    touchesOnNode.add(e.changedTouches[i].identifier);
                }
            }

            // ---- Multi-touch → pinch-zoom / two-finger pan ----
            if (e.touches.length >= 2) {
                // Cancel any pending long-press
                clearTimeout(lpTimer);
                lpTimer = undefined;

                // If we were panning, end the d3-zoom gesture first
                if (state === "panning") {
                    forwardToPaneAs("touchend", e);
                }

                if (state !== "pinching" && touchesOnNode.size > 0) {
                    state = "pinching";
                    lastA = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                    lastB = { x: e.touches[1].clientX, y: e.touches[1].clientY };
                }

                if (state === "pinching") {
                    e.stopPropagation();
                    e.preventDefault();
                }
                return;
            }

            // Still in pinch cooldown (went 2 → 1)
            if (state === "pinching") {
                e.stopPropagation();
                e.preventDefault();
                return;
            }

            const nodeId = findNodeId(e.target);

            // ---- Single touch on node body → enter pending state ----
            // In multi-select mode, also go through pending so toggle happens on touchend.
            // Handles pass through for connection flow; everything else (including controls) is
            // intercepted so we can detect pan vs tap. On tap, we re-dispatch to the original element.
            if (nodeId && !isOnHandle(e.target)) {
                state = "pending";
                const t = e.touches[0];
                touchNodeId = nodeId;
                touchStart = { x: t.clientX, y: t.clientY };
                lastPos = { x: t.clientX, y: t.clientY };
                touchTarget = e.target as HTMLElement;
                touchOnInteractive = isInteractiveElement(touchTarget);

                lpTimer = setTimeout(() => {
                    if (state === "pending") {
                        state = "longPressed";
                        navigator.vibrate?.(50);
                    }
                }, LONG_PRESS_MS);

                // Block d3-drag on the node. For interactive elements, let the entire
                // native touch sequence through (no stopPropagation / preventDefault)
                // so the browser's tap → click pipeline fires. We only stopPropagation
                // to block d3-drag — but d3-drag already skips .nodrag elements, so
                // for controls we can safely do nothing here. If the user drags, we
                // take over in touchmove.
                if (!touchOnInteractive) {
                    e.stopPropagation();
                    e.preventDefault();
                }
            }
        }

        // ---------------------------------------------------------------
        //  touchmove  (capture phase)
        // ---------------------------------------------------------------
        function onTouchMove(e: TouchEvent) {
            if (isSynthetic) return;

            // ---- Pinching ----
            if (state === "pinching") {
                e.stopPropagation();
                e.preventDefault();

                if (e.touches.length < 2 || !lastA || !lastB || !rfRef.current) return;

                const a = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                const b = { x: e.touches[1].clientX, y: e.touches[1].clientY };

                const prevDist = Math.hypot(lastB.x - lastA.x, lastB.y - lastA.y);
                const currDist = Math.hypot(b.x - a.x, b.y - a.y);
                const scaleFactor = prevDist > 0 ? currDist / prevDist : 1;

                const prevCx = (lastA.x + lastB.x) / 2;
                const prevCy = (lastA.y + lastB.y) / 2;
                const currCx = (a.x + b.x) / 2;
                const currCy = (a.y + b.y) / 2;

                const vp = rfRef.current.getViewport();
                let newZoom = vp.zoom * scaleFactor;
                const limits = zoomLimitsRef.current;
                if (limits) newZoom = Math.min(limits.max, Math.max(limits.min, newZoom));
                const realScale = newZoom / vp.zoom;

                rfRef.current.setViewport({
                    x: currCx - (prevCx - vp.x) * realScale + (currCx - prevCx),
                    y: currCy - (prevCy - vp.y) * realScale + (currCy - prevCy),
                    zoom: newZoom,
                });

                lastA = a;
                lastB = b;
                return;
            }

            // ---- Pending: decide between pan, long-press, or multi-select drag ----
            if (state === "pending" && touchStart) {
                const t = e.touches[0];
                const dx = t.clientX - touchStart.x;
                const dy = t.clientY - touchStart.y;
                const moved = dx * dx + dy * dy > MOVE_THRESHOLD_PX * MOVE_THRESHOLD_PX;

                // For interactive elements, don't interfere until drag threshold is hit
                if (!touchOnInteractive || moved) {
                    e.stopPropagation();
                    e.preventDefault();
                }

                if (moved) {
                    clearTimeout(lpTimer);
                    lpTimer = undefined;

                    if (activeRef.current) {
                        // In multi-select mode: drag moves the selection
                        state = "nodeDrag";
                        reportChangeRef.current?.();
                        // Populate dragNodeIds with all selected nodes (include touched node)
                        setNodes((nds) => {
                            for (const n of nds) {
                                if (n.selected) dragNodeIds.add(n.id);
                            }
                            if (touchNodeId) dragNodeIds.add(touchNodeId);
                            return nds;
                        });
                    } else {
                        // Movement before long-press → pan
                        state = "panning";
                        forwardToPaneAs("touchstart", e);
                    }
                }
                return;
            }

            // ---- Panning: forward to d3-zoom ----
            if (state === "panning") {
                e.stopPropagation();
                e.preventDefault();
                forwardToPaneAs("touchmove", e);
                return;
            }

            // ---- Long-pressed: check for drag ----
            if (state === "longPressed" && lastPos) {
                e.stopPropagation();
                e.preventDefault();

                const t = e.touches[0];
                const dx = t.clientX - lastPos.x;
                const dy = t.clientY - lastPos.y;

                if (dx * dx + dy * dy > MOVE_THRESHOLD_PX * MOVE_THRESHOLD_PX) {
                    state = "nodeDrag";
                    reportChangeRef.current?.();
                    // Populate drag targets: in multi-select move all selected, otherwise just touched node
                    if (touchNodeId) dragNodeIds.add(touchNodeId);
                    if (activeRef.current) {
                        setNodes((nds) => {
                            for (const n of nds) {
                                if (n.selected) dragNodeIds.add(n.id);
                            }
                            return nds;
                        });
                    }
                }

                if (state === "nodeDrag") {
                    const vp = rfRef.current?.getViewport();
                    if (vp) {
                        const flowDx = (t.clientX - lastPos.x) / vp.zoom;
                        const flowDy = (t.clientY - lastPos.y) / vp.zoom;
                        setNodes((nds) =>
                            nds.map((n) =>
                                dragNodeIds.has(n.id)
                                    ? {
                                          ...n,
                                          position: { x: n.position.x + flowDx, y: n.position.y + flowDy },
                                      }
                                    : n,
                            ),
                        );
                        lastPos = { x: t.clientX, y: t.clientY };
                    }
                }
                return;
            }

            // ---- Node drag: move node(s) ----
            if (state === "nodeDrag" && lastPos) {
                e.stopPropagation();
                e.preventDefault();

                const t = e.touches[0];
                const vp = rfRef.current?.getViewport();
                if (vp) {
                    const flowDx = (t.clientX - lastPos.x) / vp.zoom;
                    const flowDy = (t.clientY - lastPos.y) / vp.zoom;
                    setNodes((nds) =>
                        nds.map((n) =>
                            dragNodeIds.has(n.id)
                                ? { ...n, position: { x: n.position.x + flowDx, y: n.position.y + flowDy } }
                                : n,
                        ),
                    );
                    lastPos = { x: t.clientX, y: t.clientY };
                }
                return;
            }
        }

        // ---------------------------------------------------------------
        //  touchend / touchcancel  (capture phase)
        // ---------------------------------------------------------------
        function onTouchEnd(e: TouchEvent) {
            if (isSynthetic) return;

            // Clean up node-touch tracking
            for (let i = 0; i < e.changedTouches.length; i++) {
                touchesOnNode.delete(e.changedTouches[i].identifier);
            }

            // ---- Pinching ----
            if (state === "pinching") {
                e.stopPropagation();
                e.preventDefault();

                if (e.touches.length === 0) {
                    state = "idle";
                    lastA = null;
                    lastB = null;
                } else if (e.touches.length === 1) {
                    lastA = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                    lastB = null;
                }
                return;
            }

            // ---- Panning ----
            if (state === "panning") {
                e.stopPropagation();
                e.preventDefault();
                forwardToPaneAs("touchend", e);
                if (e.touches.length === 0) reset();
                return;
            }

            // ---- Pending: quick tap ----
            if (state === "pending") {
                if (activeRef.current) {
                    e.stopPropagation();
                    e.preventDefault();
                    // Multi-select mode: toggle node on lift
                    if (touchNodeId) toggleNode(touchNodeId);
                } else if (touchOnInteractive) {
                    // Tap on a form control: let the browser handle it natively
                    // (we didn't preventDefault/stopPropagation on touchstart or here)
                } else {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!touchNodeId) {
                        reset();
                        return;
                    }
                    const now = Date.now();
                    const isDoubleTap = lastTapNodeId === touchNodeId && now - lastTapTime < DOUBLE_TAP_MS;
                    lastTapTime = now;
                    lastTapNodeId = touchNodeId;

                    const nodeEl = el?.querySelector(`[data-id="${touchNodeId}"]`);
                    if (nodeEl && touchStart) {
                        nodeEl.dispatchEvent(
                            new MouseEvent("click", {
                                bubbles: true,
                                cancelable: true,
                                clientX: touchStart.x,
                                clientY: touchStart.y,
                            }),
                        );

                        if (isDoubleTap) {
                            nodeEl.dispatchEvent(
                                new MouseEvent("dblclick", {
                                    bubbles: true,
                                    cancelable: true,
                                    clientX: touchStart.x,
                                    clientY: touchStart.y,
                                }),
                            );
                        }
                    }
                }

                reset();
                return;
            }

            // ---- Long-pressed: finger lifted without drag → multi-select ----
            if (state === "longPressed") {
                e.stopPropagation();
                e.preventDefault();
                if (touchNodeId) activateMultiSelect(touchNodeId);
                reset();
                return;
            }

            // ---- Node drag: finalize ----
            if (state === "nodeDrag") {
                e.stopPropagation();
                e.preventDefault();
                reset();
                return;
            }
        }

        el.addEventListener("touchstart", onTouchStart, { capture: true });
        el.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
        el.addEventListener("touchend", onTouchEnd, { capture: true });
        el.addEventListener("touchcancel", onTouchEnd, { capture: true });

        return () => {
            el.removeEventListener("touchstart", onTouchStart, { capture: true });
            el.removeEventListener("touchmove", onTouchMove, { capture: true });
            el.removeEventListener("touchend", onTouchEnd, { capture: true });
            el.removeEventListener("touchcancel", onTouchEnd, { capture: true });
            clearTimeout(lpTimer);
        };
    }, [wrapperRef, activateMultiSelect, toggleNode, setNodes]);

    return { multiSelectActive: active, exitMultiSelect: deactivateMultiSelect };
}

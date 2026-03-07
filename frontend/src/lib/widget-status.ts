export type WidgetStatus = "online" | "warning" | "offline";

/**
 * Derive widget status from handler running/connected state,
 * with optional live store override.
 */
export function getWidgetStatus(
    live: { running: boolean; connected: boolean } | undefined,
    fallbackRunning?: boolean,
    fallbackConnected?: boolean,
): WidgetStatus {
    const running = live?.running ?? fallbackRunning ?? false;
    const connected = live?.connected ?? fallbackConnected ?? false;
    if (!running) return "offline";
    if (!connected) return "warning";
    return "online";
}

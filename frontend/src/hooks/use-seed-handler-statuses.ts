import { useEffect } from "react";
import { useAllHandlerStatusesApiHandlersStatusesGet } from "@/api/generated/handlers/handlers";
import { useHandlerIndicatorStore } from "@/stores/handler-indicators";
import { useHandlerStatusStore } from "@/stores/handler-status";

export function useSeedHandlerStatuses() {
    const { data } = useAllHandlerStatusesApiHandlersStatusesGet();
    const bulkSetStatuses = useHandlerStatusStore((s) => s.bulkSetStatuses);
    const setIndicators = useHandlerIndicatorStore((s) => s.setIndicators);

    useEffect(() => {
        if (data?.data) {
            const normalized: Record<number, { running: boolean; connected: boolean }> = {};
            for (const [key, val] of Object.entries(data.data)) {
                const id = Number(key);
                normalized[id] = { running: val.running, connected: val.connected };
                if (val.indicators?.length) {
                    setIndicators(id, val.indicators);
                }
            }
            bulkSetStatuses(normalized);
        }
    }, [data, bulkSetStatuses, setIndicators]);
}

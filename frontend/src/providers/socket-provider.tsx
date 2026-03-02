import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";
import type { AttributeValue } from "@/api/generated/contWatchAPI.schemas";
import { getAllHandlerStatusesApiHandlersStatusesGetQueryKey } from "@/api/generated/handlers/handlers";
import { useAuth } from "@/providers/auth-provider";
import { type Indicator, useHandlerIndicatorStore } from "@/stores/handler-indicators";
import { useHandlerStatusStore } from "@/stores/handler-status";
import { useLiveValuesStore } from "@/stores/live-values";

export function useSocketMutationInvalidation() {
    const queryClient = useQueryClient();
    const { token } = useAuth();
    const setAttributeValue = useLiveValuesStore((s) => s.setAttributeValue);
    const setHandlerStatus = useHandlerStatusStore((s) => s.setStatus);
    const setIndicators = useHandlerIndicatorStore((s) => s.setIndicators);

    useEffect(() => {
        if (!token) return;

        const socket = io("/", {
            path: "/socket.io",
            auth: { token },
        });

        socket.on("connect", () => {
            // Invalidate handler statuses query so the seed hook re-fetches
            queryClient.invalidateQueries({
                queryKey: getAllHandlerStatusesApiHandlersStatusesGetQueryKey(),
            });
        });

        socket.on("mutate", (data: { entity: string }) => {
            queryClient.invalidateQueries({
                predicate: (query) => {
                    const key = query.queryKey[0];
                    return typeof key === "string" && key.startsWith(`/api/${data.entity}`);
                },
            });
        });

        socket.on("attribute_value", (data: AttributeValue) => {
            setAttributeValue(data);
        });

        socket.on("handler_status", (data: { handler_id: number; running: boolean; connected: boolean }) => {
            setHandlerStatus(data.handler_id, {
                running: data.running,
                connected: data.connected,
            });
        });

        socket.on("handler_indicators", (data: { handler_id: number; indicators: Indicator[] }) => {
            setIndicators(data.handler_id, data.indicators);
        });

        return () => {
            socket.disconnect();
        };
    }, [token, queryClient, setAttributeValue, setHandlerStatus, setIndicators]);
}

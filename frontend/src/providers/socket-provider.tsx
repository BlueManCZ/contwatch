import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";
import api from "@/api/axios-instance";
import type { AttributeValue } from "@/api/generated/contWatchAPI.schemas";
import { useAuth } from "@/providers/auth-provider";
import { useHandlerStatusStore } from "@/stores/handler-status";
import { useLiveValuesStore } from "@/stores/live-values";

export function useSocketMutationInvalidation() {
    const queryClient = useQueryClient();
    const { token } = useAuth();
    const setAttributeValue = useLiveValuesStore((s) => s.setAttributeValue);
    const setHandlerStatus = useHandlerStatusStore((s) => s.setStatus);
    const bulkSetStatuses = useHandlerStatusStore((s) => s.bulkSetStatuses);

    useEffect(() => {
        if (!token) return;

        const socket = io("/", {
            path: "/socket.io",
            auth: { token },
        });

        socket.on("connect", () => {
            api.get("/handlers/statuses").then((res) => {
                const normalized: Record<number, { running: boolean; connected: boolean }> = {};
                for (const [key, val] of Object.entries(res.data) as [
                    string,
                    { running: boolean; connected: boolean },
                ][]) {
                    normalized[Number(key)] = { running: val.running, connected: val.connected };
                }
                bulkSetStatuses(normalized);
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

        return () => {
            socket.disconnect();
        };
    }, [token, queryClient, setAttributeValue, setHandlerStatus, bulkSetStatuses]);
}

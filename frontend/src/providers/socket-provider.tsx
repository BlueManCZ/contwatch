import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/api/axios-instance";
import type { AttributeValue } from "@/api/generated/contWatchAPI.schemas";
import { getAllHandlerStatusesApiHandlersStatusesGetQueryKey } from "@/api/generated/handlers/handlers";
import { useAuth } from "@/providers/auth-provider";
import { type HandlerDataValue, useHandlerDataValuesStore } from "@/stores/handler-data-values";
import { type Indicator, useHandlerIndicatorStore } from "@/stores/handler-indicators";
import { useHandlerStatusStore } from "@/stores/handler-status";
import { useLiveValuesStore } from "@/stores/live-values";
import { type DisplayValue, edgeKey, useWorkflowDisplayStore } from "@/stores/workflow-display";

let socketInstance: Socket | null = null;

export function getSocketInstance(): Socket | null {
    return socketInstance;
}

export function useSocketConnection() {
    const queryClient = useQueryClient();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) return;

        const token = getAccessToken();
        if (!token) return;

        const socket = io("/", {
            path: "/socket.io",
            auth: { token },
        });
        socketInstance = socket;

        socket.on("connect", () => {
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

        // Use getState() to avoid subscribing the component to store updates.
        // This prevents high-frequency socket events from triggering re-renders
        // in the layout component, which would cause scroll restoration to flood
        // history.replaceState() and hit the browser rate limit.
        socket.on("attribute_value", (data: AttributeValue) => {
            useLiveValuesStore.getState().setAttributeValue(data);
        });

        socket.on("handler_data_value", (data: HandlerDataValue) => {
            useHandlerDataValuesStore.getState().set(data);
        });

        socket.on(
            "handler_status",
            (data: {
                handler_id: number;
                running: boolean;
                connected: boolean;
                last_active?: string | null;
            }) => {
                useHandlerStatusStore.getState().setStatus(data.handler_id, {
                    running: data.running,
                    connected: data.connected,
                    last_active: data.last_active ?? null,
                });
            },
        );

        socket.on("handler_indicators", (data: { handler_id: number; indicators: Indicator[] }) => {
            useHandlerIndicatorStore.getState().setIndicators(data.handler_id, data.indicators);
        });

        socket.on("workflow_display", (data: { node_id: string } & DisplayValue) => {
            useWorkflowDisplayStore.getState().set(data.node_id, { value: data.value, type: data.type });
        });

        socket.on(
            "workflow_edge_value",
            (data: {
                source: string;
                source_handle: string;
                target: string;
                target_handle: string;
                value: string;
                type: string;
            }) => {
                useWorkflowDisplayStore
                    .getState()
                    .setEdgeValue(edgeKey(data.source, data.source_handle, data.target, data.target_handle), {
                        value: data.value,
                        type: data.type,
                    });
            },
        );

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible" && !socket.connected) {
                socket.connect();
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            socketInstance = null;
            socket.disconnect();
        };
    }, [isAuthenticated, queryClient]);
}

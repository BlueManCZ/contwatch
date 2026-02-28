import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";
import type { AttributeValue } from "@/api/generated/contWatchAPI.schemas";
import { useAuth } from "@/providers/auth-provider";
import { useLiveValuesStore } from "@/stores/live-values";

export function useSocketMutationInvalidation() {
    const queryClient = useQueryClient();
    const { token } = useAuth();
    const setAttributeValue = useLiveValuesStore((s) => s.setAttributeValue);

    useEffect(() => {
        if (!token) return;

        const socket = io("/", {
            path: "/socket.io",
            transports: ["websocket"],
            auth: { token },
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

        return () => {
            socket.disconnect();
        };
    }, [token, queryClient, setAttributeValue]);
}

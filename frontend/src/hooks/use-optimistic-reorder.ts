import type { QueryKey } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Hook that builds a reorder handler with optimistic cache update.
 *
 * Handles the common pattern of:
 * 1. Building `{ id, order }` pairs from reordered items
 * 2. Optimistically updating the React Query cache
 * 3. Firing the reorder mutation
 */
export function useOptimisticReorder<T extends { id: number }>(
    queryKey: QueryKey,
    mutate: (variables: { data: { items: { id: number; order: number }[] } }) => void,
): (reordered: T[]) => void {
    const queryClient = useQueryClient();

    return useCallback(
        (reordered: T[]) => {
            const items = reordered.map((item, i) => ({ id: item.id, order: i }));

            queryClient.cancelQueries({ queryKey });
            queryClient.setQueryData(queryKey, (old: unknown) => {
                if (!old || typeof old !== "object" || !("data" in old)) return old;
                return { ...old, data: reordered.map((item, i) => ({ ...item, order: i })) };
            });

            mutate({ data: { items } });
        },
        [queryClient, queryKey, mutate],
    );
}

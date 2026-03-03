import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { AxiosError } from "axios";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

function extractErrorMessage(error: unknown): string {
    const axiosError = error as AxiosError<{ detail?: string | { message?: string } }>;
    const detail = axiosError?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail)
        return detail.message ?? "An unexpected error occurred";
    return axiosError?.message ?? "An unexpected error occurred";
}

export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30 * 1000,
                        retry: 1,
                    },
                },
                mutationCache: new MutationCache({
                    onSuccess: () => {
                        // Invalidate all queries on any mutation success.
                        // Only currently observed (mounted) queries refetch;
                        // unobserved ones just get marked stale for next use.
                        queryClient.invalidateQueries();
                    },
                    onError: (error) => {
                        toast.error(extractErrorMessage(error));
                    },
                }),
            }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { AxiosError } from "axios";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

interface ValidationError {
    loc?: (string | number)[];
    msg?: string;
}

function extractErrorMessage(error: unknown): string {
    const axiosError = error as AxiosError<{
        detail?: string | { message?: string } | ValidationError[];
    }>;
    const detail = axiosError?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
        return detail.map((e) => e.msg ?? "Validation error").join("; ");
    }
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
                        staleTime: 0,
                        retry: 1,
                    },
                },
                mutationCache: new MutationCache({
                    onError: (error, _variables, _context, mutation) => {
                        // Skip global toast when the mutation handles errors locally
                        if (mutation.meta?.skipGlobalErrorToast) return;
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

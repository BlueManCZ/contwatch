import axios from "axios";

export const api = axios.create({
    baseURL: "/api",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Skip hard redirect for /auth/me — the AuthProvider handles that flow
            const url = error.config?.url ?? "";
            if (!url.endsWith("/auth/me")) {
                localStorage.removeItem("access_token");
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    },
);

// Custom mutator for orval — accepts (url, options) like fetch
// Orval generates paths with /api prefix, but axios baseURL already includes it.
// Returns {data, status, headers} to match orval's expected response shape.
export const axiosInstance = async <T>(url: string, options?: RequestInit): Promise<T> => {
    const normalizedUrl = url.startsWith("/api/") ? url.slice(4) : url;
    const response = await api.request({
        url: normalizedUrl,
        method: options?.method ?? "GET",
        data: options?.body,
        headers: options?.headers as Record<string, string> | undefined,
        signal: options?.signal as AbortSignal | undefined,
    });

    return { data: response.data, status: response.status, headers: response.headers } as T;
};

export default api;

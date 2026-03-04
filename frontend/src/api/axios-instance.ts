import axios from "axios";

// ---------------------------------------------------------------------------
// In-memory access token (never stored in localStorage)
// ---------------------------------------------------------------------------
let accessToken: string | null = null;

export function getAccessToken(): string | null {
    return accessToken;
}

export function setAccessToken(token: string | null): void {
    accessToken = token;
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
export const api = axios.create({
    baseURL: "/api",
});

api.interceptors.request.use((config) => {
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});

// ---------------------------------------------------------------------------
// Silent refresh on 401
// ---------------------------------------------------------------------------
let refreshPromise: Promise<string> | null = null;

async function silentRefresh(): Promise<string> {
    const response = await axios.post("/api/auth/refresh", null, {
        withCredentials: true,
        headers: { "X-Requested-With": "contwatch" },
    });
    const newToken: string = response.data.access_token;
    setAccessToken(newToken);
    return newToken;
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only attempt refresh on 401, and not for the refresh endpoint itself
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.endsWith("/auth/refresh")
        ) {
            originalRequest._retry = true;

            try {
                // Coalesce concurrent refresh attempts
                if (!refreshPromise) {
                    refreshPromise = silentRefresh().finally(() => {
                        refreshPromise = null;
                    });
                }
                const newToken = await refreshPromise;
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch {
                // Refresh failed — redirect to login
                setAccessToken(null);
                const currentPath = window.location.pathname + window.location.search;
                if (!currentPath.startsWith("/login")) {
                    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
                }
                return Promise.reject(error);
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

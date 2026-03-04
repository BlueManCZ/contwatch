import axios from "axios";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, setAccessToken } from "@/api/axios-instance";

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string, turnstileToken?: string | null) => Promise<void>;
    logout: () => Promise<void>;
    waitUntilReady: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const readyResolversRef = useRef<Array<() => void>>([]);

    const isAuthenticated = user !== null;

    const waitUntilReady = useCallback(() => {
        if (!isLoading) return Promise.resolve();
        return new Promise<void>((resolve) => {
            readyResolversRef.current.push(resolve);
        });
    }, [isLoading]);

    const logout = useCallback(async () => {
        try {
            await axios.post("/api/auth/logout", null, { withCredentials: true });
        } catch {
            // Best-effort — cookie may already be gone
        }
        setAccessToken(null);
        setUser(null);
    }, []);

    const login = useCallback(async (username: string, password: string, turnstileToken?: string | null) => {
        const response = await api.post(
            "/auth/login",
            { username, password, turnstile_token: turnstileToken ?? undefined },
            { withCredentials: true },
        );
        setAccessToken(response.data.access_token);

        const meResponse = await api.get("/auth/me");
        setUser(meResponse.data);
    }, []);

    // On mount: attempt silent refresh to restore session from cookie
    useEffect(() => {
        const finish = () => {
            setIsLoading(false);
            for (const resolve of readyResolversRef.current) resolve();
            readyResolversRef.current = [];
        };

        axios
            .post("/api/auth/refresh", null, {
                withCredentials: true,
                headers: { "X-Requested-With": "contwatch" },
            })
            .then((response) => {
                setAccessToken(response.data.access_token);
                return api.get("/auth/me");
            })
            .then((meResponse) => setUser(meResponse.data))
            .catch(() => {
                setAccessToken(null);
                setUser(null);
            })
            .finally(finish);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, waitUntilReady }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

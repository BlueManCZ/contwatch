import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/api/axios-instance";

interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    waitUntilReady: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem("access_token"));
    const [isLoading, setIsLoading] = useState(true);
    const readyResolversRef = useRef<Array<() => void>>([]);

    const waitUntilReady = useCallback(() => {
        if (!isLoading) return Promise.resolve();
        return new Promise<void>((resolve) => {
            readyResolversRef.current.push(resolve);
        });
    }, [isLoading]);

    const logout = useCallback(() => {
        localStorage.removeItem("access_token");
        setToken(null);
        setUser(null);
    }, []);

    const login = useCallback(async (username: string, password: string) => {
        const response = await api.post("/auth/login", { username, password });
        const accessToken = response.data.access_token;
        localStorage.setItem("access_token", accessToken);
        setToken(accessToken);

        const meResponse = await api.get("/auth/me");
        setUser(meResponse.data);
    }, []);

    useEffect(() => {
        const finish = () => {
            setIsLoading(false);
            for (const resolve of readyResolversRef.current) resolve();
            readyResolversRef.current = [];
        };

        if (!token) {
            finish();
            return;
        }

        api.get("/auth/me")
            .then((response) => setUser(response.data))
            .catch(() => logout())
            .finally(finish);
    }, [token, logout]);

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, waitUntilReady }}>
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

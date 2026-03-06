import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth/login-form";

interface LoginSearch {
    redirect?: string;
}

/** Only allow relative paths starting with a single slash. */
export function sanitizeRedirect(value?: string): string {
    if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
    return value;
}

export const Route = createFileRoute("/login")({
    validateSearch: (search: Record<string, unknown>): LoginSearch => ({
        redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    }),
    beforeLoad: ({ context, search }) => {
        if (context.auth.user) {
            throw redirect({ to: sanitizeRedirect(search.redirect) });
        }
    },
    component: LoginForm,
});

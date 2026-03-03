import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginForm } from "@/components/auth/login-form";

interface LoginSearch {
    redirect?: string;
}

export const Route = createFileRoute("/login")({
    validateSearch: (search: Record<string, unknown>): LoginSearch => ({
        redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    }),
    beforeLoad: ({ context, search }) => {
        if (context.auth.user) {
            throw redirect({ to: search.redirect || "/" });
        }
    },
    component: LoginForm,
});

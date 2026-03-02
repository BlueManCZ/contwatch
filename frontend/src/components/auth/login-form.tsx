import { isAxiosError } from "axios";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { ContwatchLogo } from "@/components/layout/contwatch-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/auth-provider";

export function LoginForm() {
    const { t } = useTranslation();
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);
        try {
            await login(username, password);
        } catch (err) {
            if (isAxiosError(err) && err.response?.status === 403) {
                setError(t("auth.userInactive"));
            } else if (isAxiosError(err) && err.response?.status === 401) {
                setError(t("auth.invalidCredentials"));
            } else {
                setError(t("auth.serverUnavailable"));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 dot-grid opacity-[0.35]" />

            {/* Ambient glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />

            <div className="relative z-10 w-full max-w-sm px-4 animate-slide-up">
                {/* Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-4 glow-amber">
                        <ContwatchLogo className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">{t("common.appName")}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t("auth.loginSubtitle")}</p>
                </div>

                <Card className="glass">
                    <CardHeader className="pb-4">
                        <h2 className="text-lg font-medium text-center">{t("auth.loginTitle")}</h2>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="username">{t("auth.username")}</Label>
                                <Input
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoFocus
                                    className="bg-background/50"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="password">{t("auth.password")}</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-background/50"
                                />
                            </div>
                            {error && (
                                <p className="text-sm text-destructive-foreground bg-destructive/10 rounded-md px-3 py-2">
                                    {error}
                                </p>
                            )}
                            <Button type="submit" className="w-full mt-1" disabled={isSubmitting}>
                                {isSubmitting ? t("common.loading") : t("auth.login")}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

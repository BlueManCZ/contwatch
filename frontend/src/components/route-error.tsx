import type { ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function RouteError({ error, reset }: ErrorComponentProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <div className="flex max-w-md flex-col items-center gap-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="size-6 text-destructive" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold">{t("error.title")}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t("error.description")}</p>
                </div>
                {import.meta.env.DEV && error.message && (
                    <pre className="w-full overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
                        {error.message}
                    </pre>
                )}
                <Button onClick={reset} className="cursor-pointer">
                    <RotateCcw className="size-4" />
                    {t("error.retry")}
                </Button>
            </div>
        </div>
    );
}

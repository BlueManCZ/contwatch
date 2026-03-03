import { Link } from "@tanstack/react-router";
import { ArrowLeft, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ContwatchLogo } from "@/components/layout/contwatch-logo";
import { Button } from "@/components/ui/button";

export function NotFound() {
    const { t } = useTranslation();

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 dot-grid opacity-[0.35]" />

            {/* Ambient glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-primary/10 blur-[100px]" />

            <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center animate-slide-up">
                {/* Logo */}
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground glow-amber">
                    <ContwatchLogo className="h-8 w-8" />
                </div>

                {/* 404 display */}
                <div className="relative select-none">
                    <span className="text-[8rem] sm:text-[10rem] font-bold leading-none tracking-tighter text-primary/15">
                        404
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Radio className="size-12 sm:size-16 text-primary animate-breathe" />
                    </div>
                </div>

                {/* Message */}
                <div className="max-w-sm -mt-4">
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                        {t("notFound.title")}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">
                        {t("notFound.description")}
                    </p>
                </div>

                {/* Action */}
                <Link to="/">
                    <Button className="cursor-pointer">
                        <ArrowLeft className="size-4" />
                        {t("notFound.backHome")}
                    </Button>
                </Link>
            </div>
        </div>
    );
}

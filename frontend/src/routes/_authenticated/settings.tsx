import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { UserManagement } from "@/components/admin/user-management";
import { PageContent, PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from "@/providers/auth-provider";
import { useSettingsStore } from "@/stores/settings";

export const Route = createFileRoute("/_authenticated/settings")({
    component: SettingsPage,
});

const LANGUAGES = [
    { value: "auto", label: "Auto" },
    { value: "en", label: "English" },
    { value: "cs", label: "Čeština" },
];

function SettingsPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { locale, setLocale } = useSettingsStore();
    const isAdmin = user?.role === "admin";

    return (
        <>
            <PageHeader title={t("nav.settings")} />
            <PageContent className="space-y-6">
                <Card className="!py-0 !gap-0">
                    <CardContent className="px-4 py-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <Label className="text-sm">{t("settings.language")}</Label>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {t("settings.languageDescription")}
                                </p>
                            </div>
                            <ToggleGroup
                                variant="outline"
                                spacing={1}
                                className="w-full sm:w-auto"
                                value={[locale]}
                                onValueChange={(values) => values.length > 0 && setLocale(values[0])}
                            >
                                {LANGUAGES.map((lang) => (
                                    <ToggleGroupItem
                                        key={lang.value}
                                        value={lang.value}
                                        className="flex-1 sm:flex-initial rounded-md px-3 text-xs"
                                    >
                                        {lang.label}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </div>
                    </CardContent>
                </Card>

                {isAdmin && (
                    <>
                        <Separator />
                        <UserManagement />
                    </>
                )}
            </PageContent>
        </>
    );
}

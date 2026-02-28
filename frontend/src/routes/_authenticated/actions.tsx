import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ActionsManager } from "@/components/actions/actions-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowEditor } from "@/components/workflow/workflow-editor";

export const Route = createFileRoute("/_authenticated/actions")({
    component: ActionsPage,
});

function ActionsPage() {
    const { t } = useTranslation();

    return (
        <Tabs defaultValue="actions" className="h-full flex-col">
            <TabsList>
                <TabsTrigger value="actions">{t("actions.title")}</TabsTrigger>
                <TabsTrigger value="workflow">{t("workflow.title")}</TabsTrigger>
            </TabsList>
            <TabsContent value="actions">
                <ActionsManager />
            </TabsContent>
            <TabsContent value="workflow" className="h-[calc(100vh-10rem)]">
                <WorkflowEditor />
            </TabsContent>
        </Tabs>
    );
}

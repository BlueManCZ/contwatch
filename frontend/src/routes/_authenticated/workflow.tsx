import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { NodeDefinition, SubWorkflowSummary } from "@/api/generated/contWatchAPI.schemas";
import { useListSubWorkflowsApiSubWorkflowsGet } from "@/api/generated/sub-workflows/sub-workflows";
import { useGetNodeDefinitionsApiActionsWorkflowNodesGet } from "@/api/generated/workflow/workflow";
import { PageHeader } from "@/components/layout/page-header";
import { NodePaletteSheet } from "@/components/workflow/node-palette";
import { SubWorkflowManager } from "@/components/workflow/sub-workflow-manager";
import { WorkflowBreadcrumbs } from "@/components/workflow/workflow-breadcrumbs";
import { WorkflowEditor, type WorkflowEditorRef } from "@/components/workflow/workflow-editor";
import { useWorkflowStore } from "@/stores/workflow-store";

type WorkflowSearch = {
    sw?: number;
};

export const Route = createFileRoute("/_authenticated/workflow")({
    component: WorkflowPage,
    validateSearch: (search: Record<string, unknown>): WorkflowSearch => ({
        sw: typeof search.sw === "number" ? search.sw : undefined,
    }),
});

function WorkflowPage() {
    const { t } = useTranslation();
    const editorRef = useRef<WorkflowEditorRef>(null);
    const { sw } = Route.useSearch();

    const breadcrumbs = useWorkflowStore((s) => s.breadcrumbs);
    const openSubWorkflow = useWorkflowStore((s) => s.openSubWorkflow);
    const currentCrumb = breadcrumbs[breadcrumbs.length - 1];
    const subWorkflowId = currentCrumb?.subWorkflowId ?? null;
    const isSubWorkflow = subWorkflowId != null;

    // Restore breadcrumb from URL on page load
    const { data: listResponse } = useListSubWorkflowsApiSubWorkflowsGet();
    const subWorkflows = (listResponse?.data ?? []) as SubWorkflowSummary[];

    const restoredRef = useRef(false);
    useEffect(() => {
        if (restoredRef.current || sw == null) return;
        const swData = subWorkflows.find((s) => s.id === sw);
        if (swData) {
            openSubWorkflow({ subWorkflowId: sw, label: swData.name });
            restoredRef.current = true;
        }
    }, [sw, subWorkflows, openSubWorkflow]);

    const context = isSubWorkflow ? "sub_workflow" : "main";
    const { data: defsResponse } = useGetNodeDefinitionsApiActionsWorkflowNodesGet({ context });
    const definitions = (defsResponse?.data ?? []) as NodeDefinition[];

    return (
        <>
            <PageHeader
                title={t("workflow.title")}
                actions={
                    <div className="flex items-center gap-2">
                        <SubWorkflowManager />
                        <NodePaletteSheet
                            definitions={definitions}
                            onAddNode={(type) => editorRef.current?.addNode(type)}
                        />
                    </div>
                }
            />
            <WorkflowBreadcrumbs />
            <div className="flex-1 min-h-0">
                <WorkflowEditor key={subWorkflowId ?? "main"} ref={editorRef} subWorkflowId={subWorkflowId} />
            </div>
        </>
    );
}

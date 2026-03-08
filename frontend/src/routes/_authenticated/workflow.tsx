import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { NodeDefinition } from "@/api/generated/contWatchAPI.schemas";
import { useGetNodeDefinitionsApiActionsWorkflowNodesGet } from "@/api/generated/workflow/workflow";
import { PageHeader } from "@/components/layout/page-header";
import { NodePaletteSheet } from "@/components/workflow/node-palette";
import { SubWorkflowManager } from "@/components/workflow/sub-workflow-manager";
import { WorkflowBreadcrumbs } from "@/components/workflow/workflow-breadcrumbs";
import { WorkflowEditor, type WorkflowEditorRef } from "@/components/workflow/workflow-editor";
import { useWorkflowDisplayStore } from "@/stores/workflow-display";

export const Route = createFileRoute("/_authenticated/workflow")({
    component: WorkflowPage,
});

function WorkflowPage() {
    const { t } = useTranslation();
    const editorRef = useRef<WorkflowEditorRef>(null);

    const breadcrumbs = useWorkflowDisplayStore((s) => s.breadcrumbs);
    const currentCrumb = breadcrumbs[breadcrumbs.length - 1];
    const subWorkflowId = currentCrumb?.subWorkflowId ?? null;
    const isSubWorkflow = subWorkflowId != null;

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

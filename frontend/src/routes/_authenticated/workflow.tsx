import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { NodeDefinition } from "@/api/generated/contWatchAPI.schemas";
import { useGetNodeDefinitionsApiActionsWorkflowNodesGet } from "@/api/generated/workflow/workflow";
import { PageHeader } from "@/components/layout/page-header";
import { NodePaletteSheet } from "@/components/workflow/node-palette";
import { WorkflowEditor, type WorkflowEditorRef } from "@/components/workflow/workflow-editor";

export const Route = createFileRoute("/_authenticated/workflow")({
    component: WorkflowPage,
});

function WorkflowPage() {
    const { t } = useTranslation();
    const editorRef = useRef<WorkflowEditorRef>(null);
    const { data: defsResponse } = useGetNodeDefinitionsApiActionsWorkflowNodesGet();
    const definitions = (defsResponse?.data ?? []) as NodeDefinition[];

    return (
        <>
            <PageHeader
                title={t("workflow.title")}
                actions={
                    <NodePaletteSheet
                        definitions={definitions}
                        onAddNode={(type) => editorRef.current?.addNode(type)}
                    />
                }
            />
            <div className="flex-1 min-h-0">
                <WorkflowEditor ref={editorRef} />
            </div>
        </>
    );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
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
    const pageRef = useRef<HTMLDivElement>(null);
    const { data: defsResponse } = useGetNodeDefinitionsApiActionsWorkflowNodesGet();
    const definitions = (defsResponse?.data ?? []) as NodeDefinition[];

    useEffect(() => {
        const mobileQuery = window.matchMedia("(max-width: 640px)");
        if (!mobileQuery.matches) return;

        const orientationQuery = window.matchMedia("(orientation: landscape)");

        function handleChange() {
            if (!pageRef.current) return;
            if (orientationQuery.matches) {
                pageRef.current.requestFullscreen?.().catch(() => {});
            } else if (document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {});
            }
        }

        orientationQuery.addEventListener("change", handleChange);
        return () => orientationQuery.removeEventListener("change", handleChange);
    }, []);

    return (
        <div ref={pageRef} className="flex flex-col flex-1 min-h-0 bg-background">
            <PageHeader
                title={t("workflow.title")}
                actions={
                    <NodePaletteSheet
                        definitions={definitions}
                        onAddNode={(type) => editorRef.current?.addNode(type)}
                    />
                }
            />
            <div className="flex-1 min-h-0 -mt-3 sm:-mt-5 -mb-3 sm:-mb-5">
                <WorkflowEditor ref={editorRef} />
            </div>
        </div>
    );
}

import { ChevronRight } from "lucide-react";
import { useWorkflowStore } from "@/stores/workflow-store";

export function WorkflowBreadcrumbs() {
    const breadcrumbs = useWorkflowStore((s) => s.breadcrumbs);
    const popToBreadcrumb = useWorkflowStore((s) => s.popToBreadcrumb);

    if (breadcrumbs.length <= 1) return null;

    return (
        <div className="flex items-center gap-1 px-4 py-1.5 border-b bg-muted/30 text-sm">
            {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                    <span key={`${index}-${crumb.subWorkflowId}`} className="flex items-center gap-1">
                        {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        {isLast ? (
                            <span className="font-medium">{crumb.label}</span>
                        ) : (
                            <button
                                type="button"
                                className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => popToBreadcrumb(index)}
                            >
                                {crumb.label}
                            </button>
                        )}
                    </span>
                );
            })}
        </div>
    );
}

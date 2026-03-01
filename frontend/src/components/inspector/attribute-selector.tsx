import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useListHandlersApiHandlersGet } from "@/api/generated/handlers/handlers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface AttributeSelectorProps {
    selectedIds: number[];
    onSelectionChange: (ids: number[]) => void;
    showLabel?: boolean;
}

export function AttributeSelector({ selectedIds, onSelectionChange, showLabel }: AttributeSelectorProps) {
    const { t } = useTranslation();
    const { data: response } = useListHandlersApiHandlersGet();
    const handlers = response?.data ?? [];

    const [localIds, setLocalIds] = useState<number[]>(selectedIds);
    const [open, setOpen] = useState(false);

    function handleOpen(isOpen: boolean) {
        if (isOpen) {
            setLocalIds(selectedIds);
        }
        setOpen(isOpen);
    }

    function toggleAttribute(id: number) {
        setLocalIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }

    function clearAll() {
        setLocalIds([]);
    }

    function apply() {
        onSelectionChange(localIds);
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger
                render={<Button variant="outline" size="sm" className={showLabel ? "" : "max-sm:px-2"} />}
            >
                <SlidersHorizontal className={showLabel ? "mr-1.5 h-3.5 w-3.5" : "h-3.5 w-3.5 sm:mr-1.5"} />
                <span className={showLabel ? "" : "hidden sm:inline"}>{t("inspector.selectAttributes")}</span>
                {selectedIds.length > 0 && (
                    <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${showLabel ? "ml-2" : "sm:ml-2"}`}
                    >
                        {selectedIds.length}
                    </Badge>
                )}
            </DialogTrigger>
            <DialogContent className="max-h-[85dvh] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("inspector.attributeSelector")}</DialogTitle>
                </DialogHeader>

                <div className="max-h-80 space-y-4 overflow-y-auto py-2">
                    {handlers.map((handler) => {
                        const attributes = handler.attributes ?? [];
                        if (attributes.length === 0) return null;
                        const handlerLabel = (handler.options as { label?: string })?.label || handler.type;
                        return (
                            <div key={handler.id}>
                                <h4 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                                    {handlerLabel}
                                    <span className="ml-1.5 text-[10px] font-normal opacity-60">
                                        #{handler.id}
                                    </span>
                                </h4>
                                <div className="space-y-1.5 pl-1">
                                    {attributes.map((attr) => (
                                        <label
                                            key={attr.id}
                                            htmlFor={`attr-${attr.id}`}
                                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
                                        >
                                            <Checkbox
                                                id={`attr-${attr.id}`}
                                                checked={localIds.includes(attr.id)}
                                                onCheckedChange={() => toggleAttribute(attr.id)}
                                            />
                                            <span className="text-sm">
                                                {attr.label || attr.name}
                                                {attr.unit && (
                                                    <span className="ml-1 text-muted-foreground text-xs">
                                                        ({attr.unit})
                                                    </span>
                                                )}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" size="sm" onClick={clearAll}>
                        {t("inspector.clearAll")}
                    </Button>
                    <DialogClose render={<Button variant="outline" size="sm" />}>
                        {t("common.cancel")}
                    </DialogClose>
                    <Button size="sm" onClick={apply}>
                        {t("common.save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

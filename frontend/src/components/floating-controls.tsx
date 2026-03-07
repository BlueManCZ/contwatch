import type { LucideIcon } from "lucide-react";
import { Maximize, Minimize } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { useTranslation } from "react-i18next";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  FloatingButton                                                     */
/* ------------------------------------------------------------------ */

interface FloatingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    active?: boolean;
    /** When true, wraps the button in an animated container that can be
     *  shown/hidden via `ref.current.dataset.visible = "true" | "false"`.
     *  The ref then points to the wrapper div instead of the button. */
    collapsible?: boolean;
    ref?: Ref<HTMLElement>;
}

export function FloatingButton({
    active,
    collapsible,
    className,
    children,
    ref,
    ...props
}: FloatingButtonProps) {
    const button = (
        <button
            ref={collapsible ? undefined : (ref as Ref<HTMLButtonElement>)}
            type="button"
            className={cn(
                "flex cursor-pointer items-center justify-center rounded-full border backdrop-blur-sm p-2 shadow-sm",
                active ? "border-primary bg-card/80" : "bg-card/80",
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );

    if (collapsible) {
        return (
            <div
                ref={ref as Ref<HTMLDivElement>}
                data-visible="false"
                className="ml-1.5 transition-all duration-150 data-[visible=false]:opacity-0 data-[visible=false]:pointer-events-none data-[visible=false]:scale-90 data-[visible=false]:w-0 data-[visible=false]:ml-0 data-[visible=false]:overflow-hidden"
            >
                {button}
            </div>
        );
    }

    return button;
}

/* ------------------------------------------------------------------ */
/*  FloatingToolbar — positioned container for control buttons         */
/* ------------------------------------------------------------------ */

interface FloatingToolbarProps {
    children: ReactNode;
    className?: string;
}

export function FloatingToolbar({ children, className }: FloatingToolbarProps) {
    return (
        <div className={cn("absolute top-2 right-2 sm:right-4 z-10 flex items-center", className)}>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  FullscreenButton — fullscreen toggle (always includes ml-1.5)     */
/* ------------------------------------------------------------------ */

interface FullscreenButtonProps {
    isFullscreen: boolean;
    onClick: () => void;
}

export function FullscreenButton({
    isFullscreen,
    onClick,
    className,
}: FullscreenButtonProps & { className?: string }) {
    const { t } = useTranslation();
    return (
        <FloatingButton
            className={className}
            onClick={onClick}
            title={isFullscreen ? t("common.exitFullscreen") : t("common.enterFullscreen")}
        >
            {isFullscreen ? (
                <Minimize className="h-4 w-4 text-muted-foreground" />
            ) : (
                <Maximize className="h-4 w-4 text-muted-foreground" />
            )}
        </FloatingButton>
    );
}

/* ------------------------------------------------------------------ */
/*  FullscreenPrompt — confirmation dialog for fullscreen entry        */
/* ------------------------------------------------------------------ */

interface FullscreenPromptProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function FullscreenPrompt({ open, onOpenChange, onConfirm }: FullscreenPromptProps) {
    const { t } = useTranslation();
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent size="sm">
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("common.fullscreenPromptTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("common.fullscreenPromptDescription")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>{t("common.enterFullscreen")}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

/* ------------------------------------------------------------------ */
/*  ChartLegend — colored pill buttons for dataset toggling            */
/* ------------------------------------------------------------------ */

interface LegendItem {
    label: string;
    color: string;
}

interface ChartLegendProps {
    items: LegendItem[];
    hiddenIndices: Set<number>;
    onToggle: (index: number) => void;
}

export function ChartLegend({ items, hiddenIndices, onToggle }: ChartLegendProps) {
    if (items.length === 0) return null;
    return (
        <div className="absolute top-2 left-2 sm:left-4 z-10 flex flex-wrap items-center gap-1">
            {items.map((item, i) => (
                <button
                    key={item.label}
                    type="button"
                    className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-full border bg-card/80 backdrop-blur-sm px-2.5 py-1 shadow-sm transition-opacity",
                        hiddenIndices.has(i) && "opacity-40",
                    )}
                    onClick={() => onToggle(i)}
                >
                    <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
                </button>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  FloatingPill — bottom-center action pill (e.g. mobile day click)   */
/* ------------------------------------------------------------------ */

interface FloatingPillProps {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
}

export function FloatingPill({ icon: Icon, label, onClick }: FloatingPillProps) {
    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <button
                type="button"
                onClick={onClick}
                className="flex cursor-pointer items-center gap-2 rounded-full border bg-card px-4 py-2.5 shadow-lg active:scale-95 transition-transform"
            >
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium font-mono tabular-nums">{label}</span>
            </button>
        </div>
    );
}

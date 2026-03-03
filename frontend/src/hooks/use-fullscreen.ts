import { type RefObject, useCallback, useEffect, useState } from "react";

const MOBILE_SHORT_SIDE = 640;

export function useFullscreen(targetRef: RefObject<HTMLElement | null>) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);

    // Track fullscreen state (handles Esc key exit too)
    useEffect(() => {
        function onFullscreenChange() {
            setIsFullscreen(document.fullscreenElement === targetRef.current);
        }
        document.addEventListener("fullscreenchange", onFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, [targetRef]);

    // Prompt fullscreen when mobile device rotates to landscape
    useEffect(() => {
        const orientationQuery = window.matchMedia("(orientation: landscape)");

        function handleChange() {
            if (Math.min(window.innerWidth, window.innerHeight) > MOBILE_SHORT_SIDE) return;
            if (orientationQuery.matches && !document.fullscreenElement) {
                setShowPrompt(true);
            } else {
                setShowPrompt(false);
            }
        }

        orientationQuery.addEventListener("change", handleChange);
        return () => orientationQuery.removeEventListener("change", handleChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!targetRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
        } else {
            targetRef.current.requestFullscreen?.().catch(() => {});
        }
    }, [targetRef]);

    const enterFullscreen = useCallback(() => {
        targetRef.current?.requestFullscreen?.().catch(() => {});
    }, [targetRef]);

    return { isFullscreen, showPrompt, setShowPrompt, toggleFullscreen, enterFullscreen };
}

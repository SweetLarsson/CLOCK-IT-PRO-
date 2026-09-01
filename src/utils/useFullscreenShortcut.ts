import { useEffect, useState, useCallback } from "react";

/**
 * Hook to manage Full-Screen Dashboard Mode
 * Listens for CTRL+F (or CMD+F) to enter/toggle full screen, and ESC to exit.
 */
export function useFullscreenShortcut() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing inside an input, textarea, or contenteditable
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        if (!isInput) {
          e.preventDefault();
          if (!document.fullscreenElement) {
            if (document.documentElement.requestFullscreen) {
              document.documentElement.requestFullscreen().catch(() => {});
            }
          } else {
            if (document.exitFullscreen) {
              document.exitFullscreen().catch(() => {});
            }
          }
        }
      } else if (e.key === "Escape") {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, []);

  return { isFullscreen, toggleFullscreen };
}

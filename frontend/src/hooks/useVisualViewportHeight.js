import { useEffect } from "react";

// Keeps the chat pinned to the visible area when the mobile keyboard opens.
export default function useVisualViewportHeight(onResize) {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--chat-vh", `${viewport.height}px`);
      window.scrollTo(0, 0);
      onResize?.();
    };

    update();
    viewport.addEventListener("resize", update);
    return () => {
      viewport.removeEventListener("resize", update);
      root.style.removeProperty("--chat-vh");
    };
  }, [onResize]);
}

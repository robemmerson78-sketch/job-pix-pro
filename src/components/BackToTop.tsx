import { useEffect, useState } from "react";

/** Small floating "↑ Top" button, shown once the page is scrolled down. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-24 right-4 z-40 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold text-primary shadow-panel print:hidden"
    >
      ↑ Top
    </button>
  );
}

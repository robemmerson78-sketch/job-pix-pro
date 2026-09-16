import { Link } from "@tanstack/react-router";
import { HardHat, Settings2 } from "lucide-react";

export function AppHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 bg-brand text-brand-foreground shadow-sm no-print">
      <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-ai text-ai-foreground">
            <HardHat className="size-5" />
          </span>
          <span className="font-display text-xl font-extrabold">
            Job<span className="text-ai">Pix</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {right}
          <Link
            to="/settings"
            className="flex size-11 items-center justify-center rounded-md text-brand-foreground/75 transition-colors hover:bg-brand-foreground/10 hover:text-brand-foreground"
            aria-label="Business settings"
          >
            <Settings2 className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

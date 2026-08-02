import { Link } from "@tanstack/react-router";
import { HardHat, Settings2 } from "lucide-react";

export function AppHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur no-print">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <HardHat className="size-5" />
          </span>
          <span className="font-display text-xl font-bold uppercase tracking-wide">
            SiteQuote
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {right}
          <Link
            to="/settings"
            className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Business settings"
          >
            <Settings2 className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

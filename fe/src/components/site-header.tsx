import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Factory, Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/#features", label: "Features", hash: true },
  { to: "/#how", label: "How It Works", hash: true },
  { to: "/#metrics", label: "Enterprise Dashboard", hash: true },
  { to: "/#verify", label: "Verify Protocol", hash: true },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <span className="grid h-12 w-12 place-items-center bg-transparent overflow-hidden">
            <img src="/logo.png" alt="OzikOps" className="h-full w-full object-contain" />
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-black tracking-widest text-slate-900 uppercase">
              OzikOps
            </span>
            <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Petrochemical Knowledge Hub
            </span>
          </div>
          <Badge
            variant="secondary"
            className="ml-1 hidden lg:inline-flex bg-blue-100 text-blue-700 border-sky-200 text-[10px] font-semibold"
          >
            CALIBER 2026
          </Badge>
        </Link>

        {isLanding && (
          <nav className="ml-6 hidden md:flex items-center gap-1">
            {NAV.map((n) => (
                <a
                  key={n.to}
                  href={n.to}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:text-foreground hover:bg-muted transition-colors"
                >
                  {n.label}
                </a>
            ))}
          </nav>
        )}

        {isLanding && (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex">
              <Link to="/auth">Masuk</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        )}
      </div>

      {isLanding && (
        <div
          className={cn(
            "md:hidden overflow-hidden border-t border-border/60 transition-all",
            open ? "max-h-96" : "max-h-0",
          )}
        >
          <nav className="flex flex-col p-3 gap-1">
            {NAV.map((n) => (
                <a
                  key={n.to}
                  href={n.to}
                  className="px-4 py-3 text-sm font-medium text-muted-foreground rounded-md hover:text-foreground hover:bg-muted transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {n.label}
                </a>
            ))}
            <div className="mt-2 flex gap-2 border-t border-border/60 pt-3">
              <Button variant="outline" size="sm" asChild className="flex-1">
                <Link to="/auth" onClick={() => setOpen(false)}>Masuk</Link>
              </Button>
              <Button size="sm" asChild className="flex-1">
                <Link to="/audit" onClick={() => setOpen(false)}>
                  Coba Gratis
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
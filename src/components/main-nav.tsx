"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Link = { href: string; label: string };

export function MainNav({ links }: { links: Link[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* Inline nav: visible on tablet/desktop */}
      <nav className="hidden md:flex flex-1 flex-wrap gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "px-3 py-2 text-sm font-medium rounded-md hover:bg-accent whitespace-nowrap",
              isActive(l.href) && "bg-accent text-accent-foreground"
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Burger trigger: visible on mobile only */}
      <div className="md:hidden flex-1 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile drawer panel */}
      {open && (
        <div className="md:hidden absolute left-0 right-0 top-16 z-50 border-b bg-card shadow-lg">
          <nav className="flex flex-col p-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "px-3 py-3 text-base font-medium rounded-md hover:bg-accent",
                  isActive(l.href) && "bg-accent text-accent-foreground"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

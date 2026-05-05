import Link from "next/link";
import Image from "next/image";
import { requireUser, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { MainNav } from "@/components/main-nav";

async function logoutAction() {
  "use server";
  await logout();
  redirect("/login");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const adminLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/lieferscheine", label: "Lieferscheine" },
    { href: "/rechnungen", label: "Rechnungen" },
    { href: "/kunden", label: "Kunden" },
    { href: "/produkte", label: "Produkte" },
    { href: "/benutzer", label: "Benutzer" },
    { href: "/einstellungen", label: "Einstellungen" },
  ];
  const fahrerLinks = [{ href: "/lieferscheine", label: "Lieferscheine" }];
  const links = isAdmin ? adminLinks : fahrerLinks;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card relative">
        <div className="container mx-auto flex h-16 items-center px-4 gap-4 max-w-screen-2xl">
          <Link href="/" className="flex items-center gap-2 md:mr-6">
            <Image src="/logo.png" alt="Eierhof" width={36} height={36} />
            <span className="font-semibold hidden sm:inline">Eierhof EMS</span>
          </Link>
          <MainNav links={links} />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden lg:inline">
              {user.name} ({isAdmin ? "Admin" : "Fahrer"})
            </span>
            <form action={logoutAction}>
              <Button variant="ghost" size="sm" type="submit" title="Abmelden">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6 max-w-screen-2xl w-full">
        {children}
      </main>
    </div>
  );
}

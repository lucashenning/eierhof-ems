import { redirect } from "next/navigation";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Image src="/logo.png" alt="Eierhof Groß Lafferde" width={120} height={120} priority />
        </div>
        <h1 className="text-2xl font-semibold text-center mb-1">Eierhof EMS</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          Lieferschein- und Rechnungs-Management
        </p>
        <LoginForm />
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BenutzerForm } from "../benutzer-form";
import { updateBenutzer } from "../actions";

export default async function BenutzerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  const action = updateBenutzer.bind(null, id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{user.name}</h1>
      <BenutzerForm
        benutzer={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          aktiv: user.aktiv,
        }}
        action={action}
        isCreate={false}
      />
    </div>
  );
}

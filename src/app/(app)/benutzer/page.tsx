import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function BenutzerPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Benutzer</h1>
        <Button asChild>
          <Link href="/benutzer/neu">
            <Plus /> Neuer Benutzer
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>E-Mail</TableHead>
            <TableHead>Rolle</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">
                <Link href={`/benutzer/${u.id}`} className="hover:underline">
                  {u.name}
                </Link>
                {!u.aktiv && (
                  <Badge variant="secondary" className="ml-2">inaktiv</Badge>
                )}
              </TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                <Badge variant={u.role === "ADMIN" ? "default" : "outline"}>
                  {u.role}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/benutzer/${u.id}`}>Bearbeiten</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

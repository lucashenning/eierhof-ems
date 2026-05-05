import { ArrowRight } from "lucide-react";
import { formatDateTime } from "@/lib/dates";

type LogEntry = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  user: { name: string } | null;
  note: string | null;
  createdAt: Date;
};

export function StatusLogList({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Noch keine Statusänderungen.</p>;
  }
  // newest first
  const sorted = [...entries].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return (
    <ol className="text-sm space-y-1.5">
      {sorted.map((e) => (
        <li key={e.id} className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatDateTime(e.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            {e.fromStatus && (
              <>
                <span className="text-muted-foreground">{e.fromStatus}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </>
            )}
            <span className="font-medium">{e.toStatus}</span>
          </span>
          {e.user && <span className="text-muted-foreground">· {e.user.name}</span>}
          {e.note && <span className="text-muted-foreground italic">— {e.note}</span>}
        </li>
      ))}
    </ol>
  );
}

"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function MonthChart({ data }: { data: { tag: string; umsatz: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 16, top: 12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="tag" tick={{ fontSize: 11 }} />
          <YAxis
            width={60}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => eurFormatter.format(v)}
          />
          <Tooltip
            formatter={(v: number) =>
              new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v)
            }
            labelFormatter={(l) => `Tag ${l}`}
          />
          <Line
            type="monotone"
            dataKey="umsatz"
            stroke="hsl(142 70% 35%)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

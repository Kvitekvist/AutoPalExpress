import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface GuildTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
}

interface GuildTableProps<T> {
  columns: GuildTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
  emptyMessage?: string;
}

export function GuildTable<T>({ columns, rows, rowKey, className, emptyMessage = "No entries found." }: GuildTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto rounded-md border border-stone-700", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gold-700/30 bg-gradient-to-b from-stone-800/80 to-stone-800/40">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-gold-400/90",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  (!col.align || col.align === "left") && "text-left"
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-parchment-300/50">
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr
              key={rowKey(row)}
              className={cn(
                "border-b border-stone-700/60 transition-colors last:border-0 hover:bg-gold-500/5",
                i % 2 === 1 && "bg-abyss-900/30"
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 py-2.5 text-parchment-200",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

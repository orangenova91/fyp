import type { FileRecord } from "@/lib/data";
import { formatBytes } from "@/lib/format";
import type { ReactNode } from "react";

export function FileList({
  files,
  renderAction,
}: {
  files: readonly FileRecord[];
  renderAction?: (file: FileRecord) => ReactNode;
}) {
  if (files.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm">
      {files.map((file) => (
        <li key={file.id} className="flex items-center gap-2">
          <span aria-hidden>📎</span>
          <a href={`/files/${file.id}`} className="link">
            {file.original_name}
          </a>
          <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
          {renderAction?.(file)}
        </li>
      ))}
    </ul>
  );
}

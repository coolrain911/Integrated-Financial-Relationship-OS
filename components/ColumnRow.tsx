"use client";

import { useState } from "react";
import type { ColumnDTO } from "@/lib/types";

export function ColumnRow({
  column,
  onOpen,
  onDeleted,
}: {
  column: ColumnDTO;
  onOpen: (columnId: number) => void;
  onDeleted: (columnId: number) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function remove(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`"${column.title}"을(를) 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/columns/${column.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      onDeleted(column.id);
    } catch {
      alert("삭제에 실패했습니다.");
      setDeleting(false);
    }
  }

  return (
    <div className="row-card">
      <div className="row-card-top">
        <div className="link-cell" onClick={() => onOpen(column.id)}>
          <div className="row-name">
            {column.num !== null ? `${column.num}. ` : ""}
            {column.title}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="pill success">{(column.category || "").split(",")[0]}</span>
          <button className="btn-danger-mini" disabled={deleting} onClick={remove}>
            {deleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}

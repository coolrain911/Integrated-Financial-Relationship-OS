"use client";

import { useMemo, useState } from "react";
import type { KnowledgeItemDTO } from "@/lib/types";

type SortKey = "title" | "category" | "itemDate";

export function KnowledgeItemTable({
  items,
  onOpen,
  onDeleted,
}: {
  items: KnowledgeItemDTO[];
  onOpen: (itemId: number) => void;
  onDeleted: (itemId: number) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("itemDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "itemDate" ? "desc" : "asc");
    }
  }

  const sorted = useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "category") cmp = (a.category || "").localeCompare(b.category || "");
      else if (sortKey === "itemDate") cmp = (a.itemDate || "").localeCompare(b.itemDate || "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [items, sortKey, sortDir]);

  function sortArrow(key: SortKey) {
    if (key !== sortKey) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  async function remove(id: number, label: string) {
    if (!confirm(`"${label}"을(를) 삭제하시겠습니까?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/knowledge-items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      onDeleted(id);
    } catch {
      alert("삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th className="sortable" onClick={() => toggleSort("title")}>
              제목{sortArrow("title")}
            </th>
            <th className="sortable" onClick={() => toggleSort("category")}>
              분류{sortArrow("category")}
            </th>
            <th className="sortable" onClick={() => toggleSort("itemDate")}>
              날짜{sortArrow("itemDate")}
            </th>
            <th className="sticky-col-right"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item) => (
            <tr key={item.id}>
              <td className="link-cell" onClick={() => onOpen(item.id)}>
                {item.title}
              </td>
              <td>
                {item.category ? <span className="pill success">{item.category}</span> : "-"}
              </td>
              <td>{item.itemDate || "-"}</td>
              <td className="sticky-col-right">
                <button
                  className="btn-danger-mini"
                  disabled={deletingId === item.id}
                  onClick={() => remove(item.id, item.title)}
                >
                  {deletingId === item.id ? "삭제 중..." : "삭제"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

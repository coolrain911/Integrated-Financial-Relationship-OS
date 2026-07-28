"use client";

import { useMemo, useState } from "react";
import type { LicenseCertDTO } from "@/lib/types";

type SortKey = "title" | "category" | "expiryDate";

function expiryPillClass(expiryDate: string | null): string {
  if (!expiryDate) return "";
  const days = Math.round((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return "danger";
  if (days <= 60) return "warn";
  return "";
}

export function LicenseCertTable({
  items,
  onOpen,
  onDeleted,
}: {
  items: LicenseCertDTO[];
  onOpen: (itemId: number) => void;
  onDeleted: (itemId: number) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("expiryDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const rows = [...items];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
      else if (sortKey === "expiryDate") cmp = (a.expiryDate || "").localeCompare(b.expiryDate || "");
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
      const res = await fetch(`/api/licenses/${id}`, { method: "DELETE" });
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
            <th>발급기관</th>
            <th>발급일</th>
            <th className="sortable" onClick={() => toggleSort("expiryDate")}>
              만료일{sortArrow("expiryDate")}
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
                <span className="pill accent">{item.category}</span>
              </td>
              <td>{item.issuer || "-"}</td>
              <td>{item.issueDate || "-"}</td>
              <td>
                {item.expiryDate ? (
                  <span className={`pill ${expiryPillClass(item.expiryDate)}`}>{item.expiryDate}</span>
                ) : (
                  "-"
                )}
              </td>
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

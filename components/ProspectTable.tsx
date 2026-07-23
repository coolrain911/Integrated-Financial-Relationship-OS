"use client";

import { useMemo, useState } from "react";
import type { ProspectDTO } from "@/lib/types";
import { compareByLastName } from "@/lib/mapping";

type SortKey = "lastName" | "category";

export function ProspectTable({
  prospects,
  onOpenProspect,
  onConverted,
  onDeleted,
}: {
  prospects: ProspectDTO[];
  onOpenProspect: (prospectId: number) => void;
  onConverted: () => void;
  onDeleted: (prospectId: number) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("lastName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [convertingId, setConvertingId] = useState<number | null>(null);
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
    const items = [...prospects];
    items.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "lastName") cmp = compareByLastName(a, b);
      else if (sortKey === "category") cmp = (a.category || "").localeCompare(b.category || "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [prospects, sortKey, sortDir]);

  function sortArrow(key: SortKey) {
    if (key !== sortKey) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  async function convert(id: number) {
    setConvertingId(id);
    try {
      const res = await fetch(`/api/prospects/${id}/convert`, { method: "POST" });
      if (!res.ok) throw new Error("전환 실패");
      onConverted();
    } catch {
      alert("전환에 실패했습니다.");
    } finally {
      setConvertingId(null);
    }
  }

  async function remove(id: number, label: string) {
    if (!confirm(`${label || "이 잠재고객"}을(를) 삭제하시겠습니까?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/prospects/${id}`, { method: "DELETE" });
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
            <th className="sortable" onClick={() => toggleSort("lastName")}>
              성{sortArrow("lastName")}
            </th>
            <th>이름</th>
            <th>한글명</th>
            <th>Email</th>
            <th>Phone</th>
            <th className="sortable" onClick={() => toggleSort("category")}>
              접촉경로{sortArrow("category")}
            </th>
            <th className="sticky-col-right"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id}>
              <td className="link-cell" onClick={() => onOpenProspect(p.id)}>
                {p.lastName || "-"}
              </td>
              <td className="link-cell" onClick={() => onOpenProspect(p.id)}>
                {p.firstName || "-"}
              </td>
              <td>{p.koreanName || "-"}</td>
              <td>{p.email || "-"}</td>
              <td>{p.phone || "-"}</td>
              <td>{p.category ? <span className="pill accent">{p.category}</span> : "-"}</td>
              <td className="sticky-col-right">
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className="btn-mini"
                    disabled={convertingId === p.id}
                    onClick={() => convert(p.id)}
                  >
                    {convertingId === p.id ? "전환 중..." : "전환"}
                  </button>
                  <button
                    className="btn-danger-mini"
                    disabled={deletingId === p.id}
                    onClick={() => remove(p.id, p.koreanName || p.lastName || "")}
                  >
                    {deletingId === p.id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

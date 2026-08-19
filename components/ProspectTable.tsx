"use client";

import { useMemo, useState } from "react";
import type { ProspectDTO } from "@/lib/types";
import { compareByLastName } from "@/lib/mapping";
import { CONTACT_CHANNEL_PRESETS } from "@/lib/options";

type SortKey = "lastName" | "contacted" | "category";

type ContactedFilterKey = "yes" | "no";

const CONTACTED_FILTER_OPTIONS: { key: ContactedFilterKey; label: string }[] = [
  { key: "yes", label: "있음" },
  { key: "no", label: "없음" },
];

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function ProspectTable({
  prospects,
  onOpenProspect,
  onDeleted,
}: {
  prospects: ProspectDTO[];
  onOpenProspect: (prospectId: number) => void;
  onDeleted: (prospectId: number) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("lastName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [activeContacted, setActiveContacted] = useState<Set<ContactedFilterKey>>(new Set());
  const [activeChannels, setActiveChannels] = useState<Set<string>>(new Set());

  const hasActiveFilter = activeContacted.size > 0 || activeChannels.size > 0;

  function clearAllFilters() {
    setActiveContacted(new Set());
    setActiveChannels(new Set());
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    if (!hasActiveFilter) return prospects;
    return prospects.filter((p) => {
      if (activeContacted.size && !activeContacted.has(p.contacted ? "yes" : "no")) return false;
      if (activeChannels.size && (!p.category || !activeChannels.has(p.category))) return false;
      return true;
    });
  }, [prospects, hasActiveFilter, activeContacted, activeChannels]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    items.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "lastName") cmp = compareByLastName(a, b);
      else if (sortKey === "contacted") cmp = Number(a.contacted) - Number(b.contacted);
      else if (sortKey === "category") cmp = (a.category || "").localeCompare(b.category || "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [filtered, sortKey, sortDir]);

  function sortArrow(key: SortKey) {
    if (key !== sortKey) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
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
    <div>
      <div className="filter-toggle-row">
        <button
          type="button"
          className={`btn-mini${hasActiveFilter ? " filter-toggle-active" : ""}`}
          onClick={() => setFilterOpen((v) => !v)}
        >
          필터{hasActiveFilter ? ` (${activeContacted.size + activeChannels.size})` : ""}{" "}
          {filterOpen ? "▲" : "▼"}
        </button>
        {hasActiveFilter && (
          <>
            <button
              type="button"
              className="btn-mini"
              onClick={clearAllFilters}
              style={{ marginLeft: 8 }}
            >
              필터 해제 (전체 보기)
            </button>
            <span className="filter-result-count">필터 결과: {filtered.length}명</span>
          </>
        )}
      </div>
      {filterOpen && (
        <div className="filter-panel">
          <div className="filter-group">
            <div className="filter-group-label">접촉유무</div>
            <div className="filter-chip-row">
              {CONTACTED_FILTER_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`filter-chip${activeContacted.has(key) ? " active" : ""}`}
                  onClick={() => setActiveContacted((prev) => toggleInSet(prev, key))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-group-label">접촉경로</div>
            <div className="filter-chip-row">
              {CONTACT_CHANNEL_PRESETS.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  className={`filter-chip${activeChannels.has(channel) ? " active" : ""}`}
                  onClick={() => setActiveChannels((prev) => toggleInSet(prev, channel))}
                >
                  {channel}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="table-scroll">
        <table className="data-table data-table-prospects">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort("lastName")}>
                성{sortArrow("lastName")}
              </th>
              <th>이름</th>
              <th>한글명</th>
              <th>Email</th>
              <th>Phone/기타정보</th>
              <th className="sortable" onClick={() => toggleSort("contacted")}>
                접촉유무{sortArrow("contacted")}
              </th>
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
                <td className="prospect-phone-cell">
                  {p.phone || "-"}
                  {p.note && <div className="row-note">{p.note}</div>}
                </td>
                <td>
                  <span className={`pill ${p.contacted ? "success" : "muted"}`}>
                    {p.contacted ? "있음" : "없음"}
                  </span>
                </td>
                <td>{p.category ? <span className="pill accent">{p.category}</span> : "-"}</td>
                <td className="sticky-col-right">
                  <button
                    className="btn-danger-mini"
                    disabled={deletingId === p.id}
                    onClick={() => remove(p.id, p.koreanName || p.lastName || "")}
                  >
                    {deletingId === p.id ? "삭제 중..." : "삭제"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { PolicyDTO } from "@/lib/types";
import { compareByLastName } from "@/lib/mapping";

type SortKey = "lastName" | "issueDate" | "category" | "carrier" | "status";

type StatusKey =
  | "surrendered"
  | "attention"
  | "policyChanged"
  | "reviewed"
  | "needsReview"
  | "upcoming"
  | "normal";

// Priority order also used to rank the 상태 column when sorted.
const STATUS_ORDER: StatusKey[] = [
  "surrendered",
  "attention",
  "policyChanged",
  "needsReview",
  "upcoming",
  "reviewed",
  "normal",
];

const STATUS_LABELS: Record<StatusKey, string> = {
  surrendered: "계약해지",
  attention: "주의요망",
  policyChanged: "정책변경",
  reviewed: "완료",
  needsReview: "검토 필요",
  upcoming: "D-day 임박",
  normal: "정상",
};

const STATUS_PILL_CLASS: Record<StatusKey, string> = {
  surrendered: "muted",
  attention: "caution",
  policyChanged: "accent",
  reviewed: "success",
  needsReview: "danger",
  upcoming: "warn",
  normal: "muted",
};

function statusKeyFor(p: PolicyDTO): StatusKey {
  if (p.surrendered) return "surrendered";
  if (p.needsAttention) return "attention";
  if (p.policyChanged) return "policyChanged";
  if (p.needsReview) return "needsReview";
  if (p.daysToAnniv !== null && p.daysToAnniv >= 0 && p.daysToAnniv <= 30) return "upcoming";
  if (p.reviewed) return "reviewed";
  return "normal";
}

function pillFor(p: PolicyDTO) {
  const key = statusKeyFor(p);
  if (key === "normal") return null;
  const label = key === "upcoming" ? `D-${p.daysToAnniv}` : STATUS_LABELS[key];
  return { cls: STATUS_PILL_CLASS[key], label };
}

export function PolicyTable({
  policies,
  onOpenPerson,
  onOpenPolicy,
  onPolicySaved,
  onPolicyDeleted,
}: {
  policies: PolicyDTO[];
  onOpenPerson: (personId: number) => void;
  onOpenPolicy: (policyId: number) => void;
  onPolicySaved: (updated: PolicyDTO) => void;
  onPolicyDeleted: (policyId: number) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("lastName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeStatuses, setActiveStatuses] = useState<Set<StatusKey>>(new Set());

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleStatusFilter(key: StatusKey) {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filtered = useMemo(() => {
    if (activeStatuses.size === 0) return policies;
    return policies.filter((p) => activeStatuses.has(statusKeyFor(p)));
  }, [policies, activeStatuses]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    items.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "lastName") cmp = compareByLastName(a, b);
      else if (sortKey === "issueDate") cmp = (a.issueDate || "").localeCompare(b.issueDate || "");
      else if (sortKey === "category") cmp = (a.category || "").localeCompare(b.category || "");
      else if (sortKey === "carrier") cmp = (a.carrier || "").localeCompare(b.carrier || "");
      else if (sortKey === "status") {
        cmp = STATUS_ORDER.indexOf(statusKeyFor(a)) - STATUS_ORDER.indexOf(statusKeyFor(b));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [filtered, sortKey, sortDir]);

  async function toggleReviewed(policy: PolicyDTO, checked: boolean) {
    setSavingId(policy.id);
    try {
      const res = await fetch(`/api/policies/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewed: checked }),
      });
      if (!res.ok) throw new Error("저장 실패");
      const updated = await res.json();
      onPolicySaved(updated);
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSavingId(null);
    }
  }

  async function remove(policy: PolicyDTO) {
    const label = `${policy.lastName} ${policy.firstName || ""}`.trim();
    if (!confirm(`${label}${policy.policyNumber ? ` (${policy.policyNumber})` : ""} 정책을 삭제하시겠습니까?`)) return;
    setDeletingId(policy.id);
    try {
      const res = await fetch(`/api/policies/${policy.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      onPolicyDeleted(policy.id);
    } catch {
      alert("삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  function sortArrow(key: SortKey) {
    if (key !== sortKey) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  return (
    <div>
      <div className="filter-chip-row">
        {STATUS_ORDER.map((key) => (
          <button
            key={key}
            className={`filter-chip${activeStatuses.has(key) ? " active" : ""}`}
            onClick={() => toggleStatusFilter(key)}
          >
            {STATUS_LABELS[key]}
          </button>
        ))}
        {activeStatuses.size > 0 && (
          <button className="filter-chip filter-chip-clear" onClick={() => setActiveStatuses(new Set())}>
            전체보기
          </button>
        )}
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => toggleSort("lastName")}>
                성{sortArrow("lastName")}
              </th>
              <th>이름</th>
              <th>Policy</th>
              <th className="sortable" onClick={() => toggleSort("issueDate")}>
                Issued Date{sortArrow("issueDate")}
              </th>
              <th className="sortable" onClick={() => toggleSort("category")}>
                Life/Annuity{sortArrow("category")}
              </th>
              <th className="sortable" onClick={() => toggleSort("carrier")}>
                회사{sortArrow("carrier")}
              </th>
              <th className="sortable" onClick={() => toggleSort("status")}>
                상태{sortArrow("status")}
              </th>
              <th>검토</th>
              <th className="sticky-col-right"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const pill = pillFor(p);
              return (
                <tr key={p.id}>
                  <td className="link-cell" onClick={() => onOpenPerson(p.personId)}>
                    {p.lastName}
                  </td>
                  <td className="link-cell" onClick={() => onOpenPerson(p.personId)}>
                    {p.firstName}
                  </td>
                  <td className="link-cell" onClick={() => onOpenPolicy(p.id)}>
                    {p.policyNumber || "-"}
                  </td>
                  <td>{p.issueDate || "-"}</td>
                  <td>{p.category}</td>
                  <td>{p.carrier || "-"}</td>
                  <td>{pill ? <span className={`pill ${pill.cls}`}>{pill.label}</span> : "-"}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={p.reviewed}
                      disabled={savingId === p.id}
                      onChange={(e) => toggleReviewed(p, e.target.checked)}
                    />
                  </td>
                  <td className="sticky-col-right">
                    <button
                      className="btn-danger-mini"
                      disabled={deletingId === p.id}
                      onClick={() => remove(p)}
                    >
                      {deletingId === p.id ? "삭제 중..." : "삭제"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { PolicyDTO } from "@/lib/types";
import { compareByLastName } from "@/lib/mapping";

type SortKey = "lastName" | "issueDate" | "category" | "carrier";

function pillFor(p: PolicyDTO) {
  if (p.surrendered) return { cls: "muted", label: "Surrendered" };
  if (p.reviewed) return { cls: "success", label: "완료" };
  if (p.needsReview) return { cls: "danger", label: "검토 필요" };
  if (p.daysToAnniv !== null && p.daysToAnniv >= 0 && p.daysToAnniv <= 30) {
    return { cls: "warn", label: `D-${p.daysToAnniv}` };
  }
  return null;
}

export function PolicyTable({
  policies,
  onOpenPerson,
  onOpenPolicy,
  onPolicySaved,
}: {
  policies: PolicyDTO[];
  onOpenPerson: (personId: number) => void;
  onOpenPolicy: (policyId: number) => void;
  onPolicySaved: (updated: PolicyDTO) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("lastName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [savingId, setSavingId] = useState<number | null>(null);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const items = [...policies];
    items.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "lastName") cmp = compareByLastName(a, b);
      else if (sortKey === "issueDate") cmp = (a.issueDate || "").localeCompare(b.issueDate || "");
      else if (sortKey === "category") cmp = (a.category || "").localeCompare(b.category || "");
      else if (sortKey === "carrier") cmp = (a.carrier || "").localeCompare(b.carrier || "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [policies, sortKey, sortDir]);

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

  function sortArrow(key: SortKey) {
    if (key !== sortKey) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
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
            <th>상태</th>
            <th>검토</th>
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

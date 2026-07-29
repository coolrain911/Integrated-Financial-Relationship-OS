"use client";

import { useMemo, useState } from "react";
import type { AgeBracket, PersonGrade, PolicyDTO } from "@/lib/types";
import { compareByLastName } from "@/lib/mapping";
import { buildGmailComposeUrl } from "@/lib/email";
import { CATEGORY_OPTIONS, PERSON_GRADE_OPTIONS } from "@/lib/options";

type SortKey = "lastName" | "issueDate" | "category" | "carrier" | "status" | "grade";

const GRADE_PILL_CLASS: Record<PersonGrade, string> = {
  A: "success",
  B: "accent",
  C: "warn",
  D: "muted",
};

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

const AGE_BRACKET_ORDER: AgeBracket[] = [
  "20대 미만",
  "20대",
  "30대",
  "40대",
  "50대",
  "60대",
  "70대 이상",
];

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

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
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
  const [activeAgeBrackets, setActiveAgeBrackets] = useState<Set<AgeBracket>>(new Set());
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [activeCarriers, setActiveCarriers] = useState<Set<string>>(new Set());
  const [activeGrades, setActiveGrades] = useState<Set<PersonGrade>>(new Set());

  const [selected, setSelected] = useState<Set<number>>(new Set());

  const carrierOptions = useMemo(() => {
    const s = new Set<string>();
    policies.forEach((p) => {
      if (p.carrier) s.add(p.carrier);
    });
    return Array.from(s).sort();
  }, [policies]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const hasActiveFilter =
    activeStatuses.size > 0 ||
    activeAgeBrackets.size > 0 ||
    activeCategories.size > 0 ||
    activeCarriers.size > 0 ||
    activeGrades.size > 0;

  const filtered = useMemo(() => {
    if (!hasActiveFilter) return policies;
    return policies.filter((p) => {
      if (activeStatuses.size && !activeStatuses.has(statusKeyFor(p))) return false;
      if (activeAgeBrackets.size && (!p.ageBracket || !activeAgeBrackets.has(p.ageBracket))) return false;
      if (activeCategories.size && !activeCategories.has(p.category)) return false;
      if (activeCarriers.size && (!p.carrier || !activeCarriers.has(p.carrier))) return false;
      if (activeGrades.size && (!p.grade || !activeGrades.has(p.grade))) return false;
      return true;
    });
  }, [
    policies,
    hasActiveFilter,
    activeStatuses,
    activeAgeBrackets,
    activeCategories,
    activeCarriers,
    activeGrades,
  ]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    items.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "lastName") cmp = compareByLastName(a, b);
      else if (sortKey === "issueDate") cmp = (a.issueDate || "").localeCompare(b.issueDate || "");
      else if (sortKey === "category") cmp = (a.category || "").localeCompare(b.category || "");
      else if (sortKey === "carrier") cmp = (a.carrier || "").localeCompare(b.carrier || "");
      else if (sortKey === "grade") cmp = (a.grade || "").localeCompare(b.grade || "");
      else if (sortKey === "status") {
        cmp = STATUS_ORDER.indexOf(statusKeyFor(a)) - STATUS_ORDER.indexOf(statusKeyFor(b));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [filtered, sortKey, sortDir]);

  const selectedEmails = useMemo(() => {
    const emails: string[] = [];
    policies.forEach((p) => {
      if (selected.has(p.id) && p.email) emails.push(p.email);
    });
    return Array.from(new Set(emails));
  }, [policies, selected]);

  function toggleSelect(id: number) {
    setSelected((prev) => toggleInSet(prev, id));
  }

  function selectAllVisible() {
    setSelected(new Set(sorted.map((p) => p.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function sendEmail() {
    if (selectedEmails.length === 0) {
      alert("이메일 주소가 있는 사람을 선택해주세요.");
      return;
    }
    window.open(buildGmailComposeUrl(selectedEmails), "_blank");
  }

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
      <div className="filter-panel">
        <div className="filter-group">
          <div className="filter-group-label">상태</div>
          <div className="filter-chip-row">
            {STATUS_ORDER.map((key) => (
              <button
                key={key}
                className={`filter-chip${activeStatuses.has(key) ? " active" : ""}`}
                onClick={() => setActiveStatuses((prev) => toggleInSet(prev, key))}
              >
                {STATUS_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-group-label">연령</div>
          <div className="filter-chip-row">
            {AGE_BRACKET_ORDER.map((bracket) => (
              <button
                key={bracket}
                className={`filter-chip${activeAgeBrackets.has(bracket) ? " active" : ""}`}
                onClick={() => setActiveAgeBrackets((prev) => toggleInSet(prev, bracket))}
              >
                {bracket}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-group-label">등급</div>
          <div className="filter-chip-row">
            {PERSON_GRADE_OPTIONS.map((g) => (
              <button
                key={g}
                className={`filter-chip${activeGrades.has(g) ? " active" : ""}`}
                onClick={() => setActiveGrades((prev) => toggleInSet(prev, g))}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-group-label">구분</div>
          <div className="filter-chip-row">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                className={`filter-chip${activeCategories.has(cat) ? " active" : ""}`}
                onClick={() => setActiveCategories((prev) => toggleInSet(prev, cat))}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        {carrierOptions.length > 0 && (
          <div className="filter-group">
            <div className="filter-group-label">회사</div>
            <div className="filter-chip-row">
              {carrierOptions.map((carrier) => (
                <button
                  key={carrier}
                  className={`filter-chip${activeCarriers.has(carrier) ? " active" : ""}`}
                  onClick={() => setActiveCarriers((prev) => toggleInSet(prev, carrier))}
                >
                  {carrier}
                </button>
              ))}
            </div>
          </div>
        )}
        {hasActiveFilter && (
          <button
            className="filter-chip filter-chip-clear"
            onClick={() => {
              setActiveStatuses(new Set());
              setActiveAgeBrackets(new Set());
              setActiveCategories(new Set());
              setActiveCarriers(new Set());
              setActiveGrades(new Set());
            }}
          >
            필터 초기화
          </button>
        )}
      </div>

      <div className="selection-bar">
        <span className="selection-count">{selected.size}명 선택됨</span>
        <button className="btn-mini" onClick={selectAllVisible}>
          화면 전체 선택
        </button>
        <button className="btn-mini" onClick={clearSelection}>
          선택 해제
        </button>
        <button className="btn-primary" disabled={selectedEmails.length === 0} onClick={sendEmail}>
          이메일 보내기 ({selectedEmails.length})
        </button>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sticky-col-left"></th>
              <th className="sortable" onClick={() => toggleSort("lastName")}>
                성{sortArrow("lastName")}
              </th>
              <th>이름</th>
              <th className="sortable" onClick={() => toggleSort("grade")}>
                등급{sortArrow("grade")}
              </th>
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
                  <td className="sticky-col-left">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                    />
                  </td>
                  <td className="link-cell" onClick={() => onOpenPerson(p.personId)}>
                    {p.lastName}
                  </td>
                  <td className="link-cell" onClick={() => onOpenPerson(p.personId)}>
                    {p.firstName}
                  </td>
                  <td>
                    {p.grade ? (
                      <span className={`pill ${GRADE_PILL_CLASS[p.grade]}`}>{p.grade}</span>
                    ) : (
                      "-"
                    )}
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

"use client";

import { Fragment, useMemo, useState } from "react";
import type { AgeBracket, PersonGrade, PolicyDTO } from "@/lib/types";
import { compareByLastName } from "@/lib/mapping";
import { buildGmailComposeUrl, buildPolicyReviewEmail } from "@/lib/email";
import { CATEGORY_OPTIONS, PERSON_GRADE_OPTIONS } from "@/lib/options";

type SortKey = "lastName" | "issueDate" | "category" | "carrier" | "status" | "grade" | "policyCount";

const GRADE_BADGE_CLASS: Record<PersonGrade, string> = {
  A: "grade-badge-a",
  B: "grade-badge-b",
  C: "grade-badge-c",
  D: "grade-badge-d",
};

type StatusKey =
  | "surrendered"
  | "attention"
  | "policyChanged"
  | "changeNeeded"
  | "agentChanged"
  | "reviewed"
  | "upcoming"
  | "normal";

// Priority order also used to rank the 상태 column when sorted.
const STATUS_ORDER: StatusKey[] = [
  "surrendered",
  "attention",
  "policyChanged",
  "changeNeeded",
  "agentChanged",
  "upcoming",
  "reviewed",
  "normal",
];

// 상태 filter chips: excludes "surrendered" (계약해지 policies now live in
// their own 해지 Plan tab, so this filter would be a no-op here) and
// "normal" (never actually shown as a badge, so filtering by it is
// meaningless).
const STATUS_FILTER_KEYS: StatusKey[] = STATUS_ORDER.filter(
  (key) => key !== "surrendered" && key !== "normal"
);

const STATUS_LABELS: Record<StatusKey, string> = {
  surrendered: "계약해지",
  attention: "주의요망",
  policyChanged: "정책변경",
  changeNeeded: "변경필요",
  agentChanged: "에이전트변경",
  reviewed: "검토완료",
  upcoming: "D-day 임박",
  normal: "정상",
};

const STATUS_PILL_CLASS: Record<StatusKey, string> = {
  surrendered: "status-badge-muted",
  attention: "status-badge-urgent",
  policyChanged: "status-badge-accent",
  changeNeeded: "status-badge-urgent",
  agentChanged: "status-badge-caution",
  reviewed: "status-badge-success",
  upcoming: "status-badge-warn",
  normal: "status-badge-muted",
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

type PeriodBucket = "5년 -" | "5-10년" | "10-15년" | "15년 +";

const PERIOD_BUCKET_ORDER: PeriodBucket[] = ["5년 -", "5-10년", "10-15년", "15년 +"];

function periodBucketFor(p: PolicyDTO): PeriodBucket | null {
  if (p.periodYears === null) return null;
  if (p.periodYears < 5) return "5년 -";
  if (p.periodYears < 10) return "5-10년";
  if (p.periodYears < 15) return "10-15년";
  return "15년 +";
}

const ISSUE_MONTH_ORDER: number[] = Array.from({ length: 12 }, (_, i) => i + 1);

function issueMonthFor(p: PolicyDTO): number | null {
  if (!p.issueDate) return null;
  const month = Number(p.issueDate.slice(5, 7));
  return Number.isNaN(month) ? null : month;
}

// A policy can have several status flags true at once (e.g. 에이전트변경 +
// 정책변경 + 검토완료 all checked). Returns every flag that applies, in
// priority order, so filtering can match on any of them while the badge/
// sort still use just the first (highest-priority) one.
function statusKeysFor(p: PolicyDTO): StatusKey[] {
  const keys: StatusKey[] = [];
  if (p.surrendered) keys.push("surrendered");
  if (p.needsAttention) keys.push("attention");
  if (p.policyChanged) keys.push("policyChanged");
  if (p.changeNeeded) keys.push("changeNeeded");
  if (p.agentChanged) keys.push("agentChanged");
  if (p.daysToAnniv !== null && p.daysToAnniv >= 0 && p.daysToAnniv <= 30) keys.push("upcoming");
  if (p.reviewed) keys.push("reviewed");
  if (keys.length === 0) keys.push("normal");
  return keys;
}

function statusKeyFor(p: PolicyDTO): StatusKey {
  return statusKeysFor(p)[0];
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
  onPolicyDeleted,
  onAddPerson,
}: {
  policies: PolicyDTO[];
  onOpenPerson: (personId: number) => void;
  onOpenPolicy: (policyId: number) => void;
  onPolicyDeleted: (policyId: number) => void;
  onAddPerson: () => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("issueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [activeStatuses, setActiveStatuses] = useState<Set<StatusKey>>(new Set());
  const [activeAgeBrackets, setActiveAgeBrackets] = useState<Set<AgeBracket>>(new Set());
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [activeCarriers, setActiveCarriers] = useState<Set<string>>(new Set());
  const [activeGrades, setActiveGrades] = useState<Set<PersonGrade>>(new Set());
  const [activePeriods, setActivePeriods] = useState<Set<PeriodBucket>>(new Set());
  const [activeIssueMonths, setActiveIssueMonths] = useState<Set<number>>(new Set());
  const [loanFilterOn, setLoanFilterOn] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  // Default view collapses each client's policies into one row (see the
  // "rows" memo below). Turning this off shows every individual policy as
  // its own row, so a client's older policies aren't hidden behind a
  // "+N" badge under a different client — needed to see the full year-by-
  // year picture of how many policies were issued/clients contacted.
  const [groupByClient, setGroupByClient] = useState(true);

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

  const activeFilterCount =
    activeStatuses.size +
    activeAgeBrackets.size +
    activeCategories.size +
    activeCarriers.size +
    activeGrades.size +
    activePeriods.size +
    activeIssueMonths.size +
    (loanFilterOn ? 1 : 0);
  const hasActiveFilter = activeFilterCount > 0;

  function clearAllFilters() {
    setActiveStatuses(new Set());
    setActiveAgeBrackets(new Set());
    setActiveCategories(new Set());
    setActiveCarriers(new Set());
    setActiveGrades(new Set());
    setActivePeriods(new Set());
    setActiveIssueMonths(new Set());
    setLoanFilterOn(false);
  }

  const filtered = useMemo(() => {
    if (!hasActiveFilter) return policies;
    return policies.filter((p) => {
      if (activeStatuses.size && !statusKeysFor(p).some((k) => activeStatuses.has(k))) return false;
      if (activeAgeBrackets.size && (!p.ageBracket || !activeAgeBrackets.has(p.ageBracket))) return false;
      if (activeCategories.size && !activeCategories.has(p.category)) return false;
      if (activeCarriers.size && (!p.carrier || !activeCarriers.has(p.carrier))) return false;
      if (activeGrades.size && (!p.grade || !activeGrades.has(p.grade))) return false;
      if (activePeriods.size) {
        const bucket = periodBucketFor(p);
        if (!bucket || !activePeriods.has(bucket)) return false;
      }
      if (activeIssueMonths.size) {
        const month = issueMonthFor(p);
        if (!month || !activeIssueMonths.has(month)) return false;
      }
      if (loanFilterOn && !p.loanOrWithdrawal) return false;
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
    activePeriods,
    activeIssueMonths,
    loanFilterOn,
  ]);

  const filteredClientCount = useMemo(
    () => new Set(filtered.map((p) => p.personId)).size,
    [filtered]
  );

  // Counts every individual policy issued per year (not just the
  // representative row shown per client), so the year divider can report
  // how many policies were actually issued that year.
  const policyCountByYear = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach((p) => {
      if (!p.issueDate) return;
      const year = p.issueDate.slice(0, 4);
      counts.set(year, (counts.get(year) ?? 0) + 1);
    });
    return counts;
  }, [filtered]);

  // Groups same-client policies into a single row: the most recently issued
  // policy is shown, and any others collapse into a "+N" badge on Policy.
  // Skipped entirely when groupByClient is off (see its declaration above).
  const rows = useMemo(() => {
    const groups: { representative: PolicyDTO; otherPolicyNumbers: string[]; otherYears: string[] }[] =
      [];

    if (groupByClient) {
      const byPerson = new Map<number, PolicyDTO[]>();
      filtered.forEach((p) => {
        const list = byPerson.get(p.personId);
        if (list) list.push(p);
        else byPerson.set(p.personId, [p]);
      });

      byPerson.forEach((list) => {
        const representative = list.reduce((best, cur) =>
          (cur.issueDate || "") > (best.issueDate || "") ? cur : best
        );
        const others = list.filter((p) => p.id !== representative.id);
        const otherPolicyNumbers = others.map((p) => p.policyNumber || "-");
        const repYear = representative.issueDate ? representative.issueDate.slice(0, 4) : null;
        const otherYears = Array.from(
          new Set(
            others
              .map((p) => (p.issueDate ? p.issueDate.slice(0, 4) : null))
              .filter((y): y is string => y !== null && y !== repYear)
          )
        ).sort();
        groups.push({ representative, otherPolicyNumbers, otherYears });
      });
    } else {
      filtered.forEach((p) => {
        groups.push({ representative: p, otherPolicyNumbers: [], otherYears: [] });
      });
    }

    groups.sort((a, b) => {
      const pa = a.representative;
      const pb = b.representative;
      let cmp = 0;
      if (sortKey === "lastName") cmp = compareByLastName(pa, pb);
      else if (sortKey === "issueDate") cmp = (pa.issueDate || "").localeCompare(pb.issueDate || "");
      else if (sortKey === "category") cmp = (pa.category || "").localeCompare(pb.category || "");
      else if (sortKey === "carrier") cmp = (pa.carrier || "").localeCompare(pb.carrier || "");
      else if (sortKey === "grade") cmp = (pa.grade || "").localeCompare(pb.grade || "");
      else if (sortKey === "status") {
        cmp = STATUS_ORDER.indexOf(statusKeyFor(pa)) - STATUS_ORDER.indexOf(statusKeyFor(pb));
      } else if (sortKey === "policyCount") {
        cmp = a.otherPolicyNumbers.length - b.otherPolicyNumbers.length;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return groups;
  }, [filtered, sortKey, sortDir, groupByClient]);

  const selectedPolicies = useMemo(
    () => policies.filter((p) => selected.has(p.id)),
    [policies, selected]
  );

  const selectedEmails = useMemo(() => {
    const emails: string[] = [];
    selectedPolicies.forEach((p) => {
      if (p.email) emails.push(p.email);
    });
    return Array.from(new Set(emails));
  }, [selectedPolicies]);

  function toggleSelect(id: number) {
    setSelected((prev) => toggleInSet(prev, id));
  }

  function selectAllVisible() {
    setSelected(new Set(rows.map((r) => r.representative.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function sendEmail() {
    if (selectedEmails.length === 0) {
      alert("이메일 주소가 있는 사람을 선택해주세요.");
      return;
    }
    // A drafted subject/body only makes sense for one policy at a time —
    // for a multi-recipient blast, fall back to a blank compose as before.
    if (selectedPolicies.length === 1) {
      const { subject, body } = buildPolicyReviewEmail(selectedPolicies[0]);
      window.open(buildGmailComposeUrl(selectedEmails, { subject, body }), "_blank");
      return;
    }
    window.open(buildGmailComposeUrl(selectedEmails), "_blank");
  }

  async function remove(policy: PolicyDTO) {
    const label = `${policy.lastName} ${policy.firstName || ""}`.trim();
    if (!confirm(`${label}${policy.policyNumber ? ` (${policy.policyNumber})` : ""} Policy를 삭제하시겠습니까?`)) return;
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
      <div className="filter-toggle-row">
        <button
          type="button"
          className={`btn-mini${hasActiveFilter ? " filter-toggle-active" : ""}`}
          onClick={() => setFilterOpen((v) => !v)}
        >
          필터{hasActiveFilter ? ` (${activeFilterCount})` : ""} {filterOpen ? "▲" : "▼"}
        </button>
        <button
          type="button"
          className={`btn-mini${!groupByClient ? " filter-toggle-active" : ""}`}
          onClick={() => setGroupByClient((v) => !v)}
          style={{ marginLeft: 8 }}
        >
          {groupByClient ? "전체 Policy 보기" : "고객별 보기"}
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
            <span className="filter-result-count">
              필터 결과: 고객 {filteredClientCount}명 · Policy {filtered.length}건
            </span>
          </>
        )}
      </div>
      {filterOpen && (
      <div className="filter-panel">
        <div className="filter-group">
          <div className="filter-group-label">상태</div>
          <div className="filter-chip-row">
            {STATUS_FILTER_KEYS.map((key) => (
              <button
                key={key}
                className={`filter-chip${activeStatuses.has(key) ? " active" : ""}`}
                onClick={() => setActiveStatuses((prev) => toggleInSet(prev, key))}
              >
                {STATUS_LABELS[key]}
              </button>
            ))}
            <button
              className={`filter-chip${loanFilterOn ? " active" : ""}`}
              onClick={() => setLoanFilterOn((prev) => !prev)}
            >
              Loan / Withdrawal 있음
            </button>
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
        <div className="filter-group">
          <div className="filter-group-label">가입기간</div>
          <div className="filter-chip-row">
            {PERIOD_BUCKET_ORDER.map((bucket) => (
              <button
                key={bucket}
                className={`filter-chip${activePeriods.has(bucket) ? " active" : ""}`}
                onClick={() => setActivePeriods((prev) => toggleInSet(prev, bucket))}
              >
                {bucket}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <div className="filter-group-label">가입월</div>
          <div className="filter-chip-row">
            {ISSUE_MONTH_ORDER.map((month) => (
              <button
                key={month}
                className={`filter-chip${activeIssueMonths.has(month) ? " active" : ""}`}
                onClick={() => setActiveIssueMonths((prev) => toggleInSet(prev, month))}
              >
                {month}월
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
          <button className="filter-chip filter-chip-clear" onClick={clearAllFilters}>
            필터 초기화
          </button>
        )}
      </div>
      )}

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
        <button className="btn-mini" style={{ marginLeft: "auto" }} onClick={onAddPerson}>
          + 새 고객
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
              <th className="sortable" onClick={() => toggleSort("policyCount")}>
                Policy{sortArrow("policyCount")}
              </th>
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
              <th>주의</th>
              <th className="sticky-col-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const p = row.representative;
              const pill = pillFor(p);
              const year = p.issueDate ? p.issueDate.slice(0, 4) : null;
              const prevYear =
                idx > 0 && rows[idx - 1].representative.issueDate
                  ? rows[idx - 1].representative.issueDate!.slice(0, 4)
                  : null;
              const showYearDivider = sortKey === "issueDate" && year !== null && year !== prevYear;
              return (
                <Fragment key={p.id}>
                  {showYearDivider && (
                    <tr className="year-divider-row">
                      <td className="year-divider-cell" colSpan={11}>
                        {year}년 · Policy {policyCountByYear.get(year) ?? 0}건
                      </td>
                    </tr>
                  )}
                  <tr>
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
                        <span className={`grade-badge ${GRADE_BADGE_CLASS[p.grade]}`}>{p.grade}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="link-cell" onClick={() => onOpenPolicy(p.id)}>
                      {p.policyNumber || "-"}
                      {row.otherPolicyNumbers.length > 0 && (
                        <span
                          className="policy-extra-badge"
                          title={`추가 Policy: ${row.otherPolicyNumbers.join(", ")}`}
                        >
                          +{row.otherPolicyNumbers.length}
                        </span>
                      )}
                    </td>
                    <td>
                      {p.issueDate || "-"}
                      {row.otherYears.length > 0 && (
                        <div className="issue-date-other-years">
                          +{row.otherYears.join(", ")}
                        </div>
                      )}
                    </td>
                    <td>{p.category}</td>
                    <td>{p.carrier || "-"}</td>
                    <td>{pill ? <span className={`status-badge ${pill.cls}`}>{pill.label}</span> : "-"}</td>
                    <td>
                      {p.needsAttention || p.changeNeeded ? (
                        <span className="review-flag-mark" title="주의요망 또는 변경필요">
                          ✓
                        </span>
                      ) : (
                        <span className="review-flag-empty" />
                      )}
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
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PolicyRow } from "@/components/PolicyRow";
import { PolicyTable } from "@/components/PolicyTable";
import { ProspectTable } from "@/components/ProspectTable";
import { ColumnRow } from "@/components/ColumnRow";
import { PersonModal } from "@/components/PersonModal";
import { PolicyModal } from "@/components/PolicyModal";
import { ProspectModal } from "@/components/ProspectModal";
import { ColumnModal } from "@/components/ColumnModal";
import type { ColumnDTO, PersonDTO, PolicyDTO, ProspectDTO } from "@/lib/types";

type Tab = "today" | "clients" | "prospects" | "columns";

const NAV_ITEMS: { tab: Tab; label: string }[] = [
  { tab: "today", label: "Today" },
  { tab: "clients", label: "Current Client" },
  { tab: "prospects", label: "Potential Client" },
  { tab: "columns", label: "Columns" },
];

type PersonModalState = { mode: "closed" } | { mode: "edit"; id: number } | { mode: "create" };
type PolicyModalState =
  | { mode: "closed" }
  | { mode: "edit"; id: number }
  | { mode: "create"; personId: number };
type ProspectModalState = { mode: "closed" } | { mode: "edit"; id: number } | { mode: "create" };
type ColumnModalState = { mode: "closed" } | { mode: "edit"; id: number } | { mode: "create" };

export default function Home() {
  const [policies, setPolicies] = useState<PolicyDTO[]>([]);
  const [prospects, setProspects] = useState<ProspectDTO[]>([]);
  const [columns, setColumns] = useState<ColumnDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [search, setSearch] = useState("");
  const [dateStr, setDateStr] = useState("");

  const [personModal, setPersonModal] = useState<PersonModalState>({ mode: "closed" });
  const [policyModal, setPolicyModal] = useState<PolicyModalState>({ mode: "closed" });
  const [prospectModal, setProspectModal] = useState<ProspectModalState>({ mode: "closed" });
  const [columnModal, setColumnModal] = useState<ColumnModalState>({ mode: "closed" });

  useEffect(() => {
    // Deliberately deferred to an effect: the page is statically prerendered,
    // so computing "today" during render would bake the build-time date into
    // the HTML and mismatch the client's real date on hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDateStr(
      new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      })
    );
  }, []);

  const loadAll = useCallback(async () => {
    const [pol, p, col] = await Promise.all([
      fetch("/api/policies").then((r) => r.json()),
      fetch("/api/prospects").then((r) => r.json()),
      fetch("/api/columns").then((r) => r.json()),
    ]);
    setPolicies(pol);
    setProspects(p);
    setColumns(col);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // Data fetch on mount — the resulting setState calls happen inside
    // loadAll's own async continuation, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  const handlePolicySaved = useCallback((updated: PolicyDTO) => {
    setPolicies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const handlePolicyCreated = useCallback((created: PolicyDTO) => {
    setPolicies((prev) => [...prev, created]);
  }, []);

  const handlePolicyDeleted = useCallback((id: number) => {
    setPolicies((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handlePersonSaved = useCallback(() => {
    // Person edits (name, etc.) can change what a policy row displays, so
    // refresh the policies list to pick that up.
    loadAll();
  }, [loadAll]);

  const handlePersonCreated = useCallback((created: PersonDTO) => {
    // A person with zero policies won't show up anywhere (Current Client is a
    // policies table), so immediately prompt for their first policy.
    setPolicyModal({ mode: "create", personId: created.id });
  }, []);

  const handlePersonDeleted = useCallback(() => {
    // Deleting a person cascades to all of their policies in the database.
    loadAll();
  }, [loadAll]);

  const handleProspectConverted = useCallback(async () => {
    // Refetch rather than optimistically splicing — this is an infrequent,
    // deliberate action (a button click), not concurrent typing, so the
    // small round-trip cost buys simpler, more obviously-correct code.
    const [pol, p] = await Promise.all([
      fetch("/api/policies").then((r) => r.json()),
      fetch("/api/prospects").then((r) => r.json()),
    ]);
    setPolicies(pol);
    setProspects(p);
  }, []);

  const handleProspectSaved = useCallback((updated: ProspectDTO) => {
    setProspects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const handleProspectCreated = useCallback((created: ProspectDTO) => {
    setProspects((prev) => [...prev, created]);
  }, []);

  const handleProspectDeleted = useCallback((id: number) => {
    setProspects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleColumnSaved = useCallback((updated: ColumnDTO) => {
    setColumns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  const handleColumnCreated = useCallback((created: ColumnDTO) => {
    setColumns((prev) => [...prev, created]);
  }, []);

  const handleColumnDeleted = useCallback((id: number) => {
    setColumns((prev) => prev.filter((c) => c.id !== id));
  }, []);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setSearch("");
  }

  const filteredPolicies = useMemo(() => {
    const f = search.toLowerCase();
    return policies.filter(
      (p) => !f || `${p.lastName} ${p.firstName || ""}`.toLowerCase().includes(f)
    );
  }, [policies, search]);

  const filteredProspects = useMemo(() => {
    const f = search.toLowerCase();
    return prospects.filter(
      (p) =>
        !f ||
        `${p.lastName || ""} ${p.firstName || ""} ${p.koreanName || ""}`.toLowerCase().includes(f)
    );
  }, [prospects, search]);

  const filteredColumns = useMemo(() => {
    const f = search.toLowerCase();
    return columns.filter((c) => !f || (c.title || "").toLowerCase().includes(f));
  }, [columns, search]);

  const uniquePeople = useMemo(() => new Set(policies.map((p) => p.personId)).size, [policies]);
  const reviewCount = useMemo(
    () => policies.filter((p) => p.needsReview && !p.reviewed).length,
    [policies]
  );
  const weekAnniv = useMemo(
    () =>
      policies.filter((p) => p.daysToAnniv !== null && p.daysToAnniv >= 0 && p.daysToAnniv <= 7)
        .length,
    [policies]
  );

  const reviewItems = useMemo(
    () => policies.filter((p) => p.needsReview && !p.reviewed).slice(0, 6),
    [policies]
  );
  const annivItems = useMemo(
    () =>
      policies
        .filter((p) => p.daysToAnniv !== null && p.daysToAnniv >= 0 && p.daysToAnniv <= 30)
        .sort((a, b) => (a.daysToAnniv as number) - (b.daysToAnniv as number))
        .slice(0, 6),
    [policies]
  );

  const kpis = [
    { n: uniquePeople, l: "전체 고객", cls: "" },
    { n: policies.length, l: "전체 정책", cls: "" },
    { n: prospects.length, l: "잠재고객", cls: "accent" },
    { n: weekAnniv, l: "이번주 anniversary", cls: "accent" },
    { n: reviewCount, l: "검토 필요", cls: "danger" },
  ];

  return (
    <div className="app">
      <div className="sidebar">
        <div className="logo">Financial Relationship</div>
        <div className="logo-sub">OS · 실제 데이터 연동</div>
        {NAV_ITEMS.map((item) => (
          <div
            key={item.tab}
            className={`nav-item${activeTab === item.tab ? " active" : ""}`}
            onClick={() => switchTab(item.tab)}
          >
            <span className="nav-dot" />
            {item.label}
          </div>
        ))}
      </div>

      <div className="main">
        <div className="searchbar">
          <span>Search</span>
          <input
            placeholder="고객, 잠재고객, 칼럼 이름으로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {!loaded ? (
          <div className="empty">불러오는 중...</div>
        ) : (
          <>
            {activeTab === "today" && (
              <div className="tab-panel active">
                <div className="greeting-eyebrow">{dateStr}</div>
                <div className="greeting">Good morning, Chanwoo.</div>
                <div className="greeting-sub">오늘 챙겨야 할 사람과 일이 정리되어 있습니다.</div>
                <div className="kpi-grid">
                  {kpis.map((k) => (
                    <div key={k.l} className={`kpi ${k.cls}`}>
                      <div className="n">{k.n}</div>
                      <div className="l">{k.l}</div>
                    </div>
                  ))}
                </div>
                <div className="two-col">
                  <div className="section">
                    <div className="section-title">검토 필요</div>
                    {reviewItems.length ? (
                      reviewItems.map((p) => (
                        <PolicyRow
                          key={p.id}
                          policy={p}
                          onOpenPerson={(id) => setPersonModal({ mode: "edit", id })}
                          onOpenPolicy={(id) => setPolicyModal({ mode: "edit", id })}
                          onSaved={handlePolicySaved}
                        />
                      ))
                    ) : (
                      <div className="empty">검토 필요 항목 없음</div>
                    )}
                  </div>
                  <div className="section">
                    <div className="section-title">다가오는 Anniversary (30일 이내)</div>
                    {annivItems.length ? (
                      annivItems.map((p) => (
                        <PolicyRow
                          key={p.id}
                          policy={p}
                          onOpenPerson={(id) => setPersonModal({ mode: "edit", id })}
                          onOpenPolicy={(id) => setPolicyModal({ mode: "edit", id })}
                          onSaved={handlePolicySaved}
                        />
                      ))
                    ) : (
                      <div className="empty">30일 이내 anniversary 없음</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "clients" && (
              <div className="tab-panel active">
                <div className="section-title-row">
                  <div className="section-title">전체 고객 · {filteredPolicies.length}건</div>
                  <button className="btn-mini" onClick={() => setPersonModal({ mode: "create" })}>
                    + 새 고객
                  </button>
                </div>
                {filteredPolicies.length ? (
                  <PolicyTable
                    policies={filteredPolicies}
                    onOpenPerson={(id) => setPersonModal({ mode: "edit", id })}
                    onOpenPolicy={(id) => setPolicyModal({ mode: "edit", id })}
                    onPolicySaved={handlePolicySaved}
                  />
                ) : (
                  <div className="empty">검색 결과 없음</div>
                )}
              </div>
            )}

            {activeTab === "prospects" && (
              <div className="tab-panel active">
                <div className="section-title-row">
                  <div className="section-title">잠재고객 · {filteredProspects.length}명</div>
                  <button className="btn-mini" onClick={() => setProspectModal({ mode: "create" })}>
                    + 새 잠재고객
                  </button>
                </div>
                {filteredProspects.length ? (
                  <ProspectTable
                    prospects={filteredProspects}
                    onOpenProspect={(id) => setProspectModal({ mode: "edit", id })}
                    onConverted={handleProspectConverted}
                  />
                ) : (
                  <div className="empty">검색 결과 없음</div>
                )}
              </div>
            )}

            {activeTab === "columns" && (
              <div className="tab-panel active">
                <div className="section-title-row">
                  <div className="section-title">재정칼럼 라이브러리 · {filteredColumns.length}편</div>
                  <button className="btn-mini" onClick={() => setColumnModal({ mode: "create" })}>
                    + 새 칼럼
                  </button>
                </div>
                <div className="list-scroll">
                  {filteredColumns.length ? (
                    filteredColumns.map((c) => (
                      <ColumnRow
                        key={c.id}
                        column={c}
                        onOpen={(id) => setColumnModal({ mode: "edit", id })}
                      />
                    ))
                  ) : (
                    <div className="empty">검색 결과 없음</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {personModal.mode !== "closed" && (
        <PersonModal
          personId={personModal.mode === "edit" ? personModal.id : null}
          onClose={() => setPersonModal({ mode: "closed" })}
          onSaved={handlePersonSaved}
          onCreated={handlePersonCreated}
          onDeleted={handlePersonDeleted}
          onOpenPolicy={(policyId) => {
            setPersonModal({ mode: "closed" });
            setPolicyModal({ mode: "edit", id: policyId });
          }}
          onAddPolicy={(personId) => {
            setPersonModal({ mode: "closed" });
            setPolicyModal({ mode: "create", personId });
          }}
        />
      )}
      {policyModal.mode !== "closed" && (
        <PolicyModal
          policyId={policyModal.mode === "edit" ? policyModal.id : null}
          personId={policyModal.mode === "create" ? policyModal.personId : undefined}
          onClose={() => setPolicyModal({ mode: "closed" })}
          onSaved={handlePolicySaved}
          onCreated={handlePolicyCreated}
          onDeleted={handlePolicyDeleted}
        />
      )}
      {prospectModal.mode !== "closed" && (
        <ProspectModal
          prospectId={prospectModal.mode === "edit" ? prospectModal.id : null}
          onClose={() => setProspectModal({ mode: "closed" })}
          onSaved={handleProspectSaved}
          onCreated={handleProspectCreated}
          onDeleted={handleProspectDeleted}
          onConverted={handleProspectConverted}
        />
      )}
      {columnModal.mode !== "closed" && (
        <ColumnModal
          columnId={columnModal.mode === "edit" ? columnModal.id : null}
          onClose={() => setColumnModal({ mode: "closed" })}
          onSaved={handleColumnSaved}
          onCreated={handleColumnCreated}
          onDeleted={handleColumnDeleted}
        />
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PolicyRow } from "@/components/PolicyRow";
import { PolicyTable } from "@/components/PolicyTable";
import { ProspectRow } from "@/components/ProspectRow";
import { ColumnRow } from "@/components/ColumnRow";
import { PersonModal } from "@/components/PersonModal";
import { PolicyModal } from "@/components/PolicyModal";
import type { ColumnDTO, PolicyDTO, ProspectDTO } from "@/lib/types";

type Tab = "today" | "clients" | "prospects" | "columns";

const NAV_ITEMS: { tab: Tab; label: string }[] = [
  { tab: "today", label: "Today" },
  { tab: "clients", label: "Current Client" },
  { tab: "prospects", label: "Potential Client" },
  { tab: "columns", label: "Columns" },
];

export default function Home() {
  const [policies, setPolicies] = useState<PolicyDTO[]>([]);
  const [prospects, setProspects] = useState<ProspectDTO[]>([]);
  const [columns, setColumns] = useState<ColumnDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [search, setSearch] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [openPersonId, setOpenPersonId] = useState<number | null>(null);
  const [openPolicyId, setOpenPolicyId] = useState<number | null>(null);

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

  const handlePersonSaved = useCallback(() => {
    // Person edits (name, etc.) can change what a policy row displays, so
    // refresh the policies list to pick that up.
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
    return prospects.filter((p) => !f || (p.name || "").toLowerCase().includes(f));
  }, [prospects, search]);

  const filteredColumns = useMemo(() => {
    const f = search.toLowerCase();
    return columns.filter((c) => !f || (c.title || "").toLowerCase().includes(f));
  }, [columns, search]);

  const prospectsBySegment = useMemo(() => {
    const map = new Map<string, ProspectDTO[]>();
    filteredProspects.forEach((p) => {
      const arr = map.get(p.segment) ?? [];
      arr.push(p);
      map.set(p.segment, arr);
    });
    return Array.from(map.entries());
  }, [filteredProspects]);

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
                          onOpenPerson={setOpenPersonId}
                          onOpenPolicy={setOpenPolicyId}
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
                          onOpenPerson={setOpenPersonId}
                          onOpenPolicy={setOpenPolicyId}
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
                <div className="section-title">전체 고객 · {filteredPolicies.length}건</div>
                {filteredPolicies.length ? (
                  <PolicyTable
                    policies={filteredPolicies}
                    onOpenPerson={setOpenPersonId}
                    onOpenPolicy={setOpenPolicyId}
                    onPolicySaved={handlePolicySaved}
                  />
                ) : (
                  <div className="empty">검색 결과 없음</div>
                )}
              </div>
            )}

            {activeTab === "prospects" && (
              <div className="tab-panel active">
                <div className="section-title">잠재고객 · {filteredProspects.length}명</div>
                <div className="list-scroll">
                  {prospectsBySegment.length ? (
                    prospectsBySegment.map(([segment, items]) => (
                      <div key={segment}>
                        <div className="seg-header">
                          {segment} · {items.length}
                        </div>
                        {items.map((p) => (
                          <ProspectRow
                            key={p.id}
                            prospect={p}
                            onConverted={handleProspectConverted}
                          />
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="empty">검색 결과 없음</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "columns" && (
              <div className="tab-panel active">
                <div className="section-title">재정칼럼 라이브러리 · {filteredColumns.length}편</div>
                <div className="list-scroll">
                  {filteredColumns.length ? (
                    filteredColumns.map((c) => <ColumnRow key={c.id} column={c} />)
                  ) : (
                    <div className="empty">검색 결과 없음</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {openPersonId !== null && (
        <PersonModal
          personId={openPersonId}
          onClose={() => setOpenPersonId(null)}
          onSaved={handlePersonSaved}
          onOpenPolicy={(policyId) => {
            setOpenPersonId(null);
            setOpenPolicyId(policyId);
          }}
        />
      )}
      {openPolicyId !== null && (
        <PolicyModal
          policyId={openPolicyId}
          onClose={() => setOpenPolicyId(null)}
          onSaved={handlePolicySaved}
        />
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClientRow } from "@/components/ClientRow";
import { ProspectRow } from "@/components/ProspectRow";
import { ColumnRow } from "@/components/ColumnRow";
import type { ClientDTO, ColumnDTO, ProspectDTO } from "@/lib/types";

type Tab = "today" | "clients" | "prospects" | "columns";

const NAV_ITEMS: { tab: Tab; label: string }[] = [
  { tab: "today", label: "Today" },
  { tab: "clients", label: "Clients" },
  { tab: "prospects", label: "Prospects" },
  { tab: "columns", label: "Columns" },
];

export default function Home() {
  const [clients, setClients] = useState<ClientDTO[]>([]);
  const [prospects, setProspects] = useState<ProspectDTO[]>([]);
  const [columns, setColumns] = useState<ColumnDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [search, setSearch] = useState("");
  const [dateStr, setDateStr] = useState("");

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

  useEffect(() => {
    (async () => {
      const [c, p, col] = await Promise.all([
        fetch("/api/clients").then((r) => r.json()),
        fetch("/api/prospects").then((r) => r.json()),
        fetch("/api/columns").then((r) => r.json()),
      ]);
      setClients(c);
      setProspects(p);
      setColumns(col);
      setLoaded(true);
    })();
  }, []);

  const handleClientSaved = useCallback((updated: ClientDTO) => {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  const handleProspectConverted = useCallback(async () => {
    // Refetch both lists rather than optimistically splicing them together —
    // this is an infrequent, deliberate action (a button click), not
    // concurrent typing, so the small round-trip cost buys simpler, more
    // obviously-correct code.
    const [c, p] = await Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/prospects").then((r) => r.json()),
    ]);
    setClients(c);
    setProspects(p);
  }, []);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setSearch("");
  }

  const filteredClients = useMemo(() => {
    const f = search.toLowerCase();
    return clients.filter((c) => !f || (c.name || "").toLowerCase().includes(f));
  }, [clients, search]);

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

  const uniqueClients = useMemo(() => new Set(clients.map((c) => c.name)).size, [clients]);
  const reviewCount = useMemo(
    () => clients.filter((c) => c.needsReview && !c.reviewed).length,
    [clients]
  );
  const weekAnniv = useMemo(
    () =>
      clients.filter((c) => c.daysToAnniv !== null && c.daysToAnniv >= 0 && c.daysToAnniv <= 7)
        .length,
    [clients]
  );

  const reviewItems = useMemo(
    () => clients.filter((c) => c.needsReview && !c.reviewed).slice(0, 6),
    [clients]
  );
  const annivItems = useMemo(
    () =>
      clients
        .filter((c) => c.daysToAnniv !== null && c.daysToAnniv >= 0 && c.daysToAnniv <= 30)
        .sort((a, b) => (a.daysToAnniv as number) - (b.daysToAnniv as number))
        .slice(0, 6),
    [clients]
  );

  const kpis = [
    { n: uniqueClients, l: "전체 고객", cls: "" },
    { n: clients.length, l: "전체 정책", cls: "" },
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
                      reviewItems.map((c) => (
                        <ClientRow key={c.id} client={c} onSaved={handleClientSaved} />
                      ))
                    ) : (
                      <div className="empty">검토 필요 항목 없음</div>
                    )}
                  </div>
                  <div className="section">
                    <div className="section-title">다가오는 Anniversary (30일 이내)</div>
                    {annivItems.length ? (
                      annivItems.map((c) => (
                        <ClientRow key={c.id} client={c} onSaved={handleClientSaved} />
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
                <div className="section-title">전체 고객 · {filteredClients.length}건</div>
                <div className="list-scroll">
                  {filteredClients.length ? (
                    filteredClients.map((c) => (
                      <ClientRow key={c.id} client={c} onSaved={handleClientSaved} />
                    ))
                  ) : (
                    <div className="empty">검색 결과 없음</div>
                  )}
                </div>
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
    </div>
  );
}

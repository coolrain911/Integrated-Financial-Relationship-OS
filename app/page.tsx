"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PolicyRow } from "@/components/PolicyRow";
import { PolicyTable } from "@/components/PolicyTable";
import { ProspectTable } from "@/components/ProspectTable";
import { ColumnRow } from "@/components/ColumnRow";
import { Calendar } from "@/components/Calendar";
import { PersonModal } from "@/components/PersonModal";
import { PolicyModal } from "@/components/PolicyModal";
import { ProspectModal } from "@/components/ProspectModal";
import { ColumnModal } from "@/components/ColumnModal";
import { KnowledgeItemTable } from "@/components/KnowledgeItemTable";
import { KnowledgeItemModal } from "@/components/KnowledgeItemModal";
import { LicenseCertTable } from "@/components/LicenseCertTable";
import { LicenseCertModal } from "@/components/LicenseCertModal";
import type {
  CalendarEventDTO,
  ColumnDTO,
  KnowledgeItemDTO,
  LicenseCertDTO,
  PersonDTO,
  PolicyDTO,
  ProspectDTO,
} from "@/lib/types";
import { buildGmailComposeUrl } from "@/lib/email";

type Tab =
  | "today"
  | "clients"
  | "prospects"
  | "calendar"
  | "columns"
  | "knowledge"
  | "licenses";

const NAV_ITEMS: { tab: Tab; label: string }[] = [
  { tab: "today", label: "Dashboard Today" },
  { tab: "clients", label: "Current Client" },
  { tab: "prospects", label: "Potential Client" },
  { tab: "calendar", label: "Calendar" },
  { tab: "columns", label: "Columns" },
  { tab: "knowledge", label: "Knowledge Vault" },
  { tab: "licenses", label: "License & Certificate" },
];

type PersonModalState = { mode: "closed" } | { mode: "edit"; id: number } | { mode: "create" };
type PolicyModalState =
  | { mode: "closed" }
  | { mode: "edit"; id: number }
  | { mode: "create"; personId: number };
type ProspectModalState = { mode: "closed" } | { mode: "edit"; id: number } | { mode: "create" };
type ColumnModalState = { mode: "closed" } | { mode: "edit"; id: number } | { mode: "create" };
type KnowledgeItemModalState = { mode: "closed" } | { mode: "edit"; id: number } | { mode: "create" };
type LicenseCertModalState = { mode: "closed" } | { mode: "edit"; id: number } | { mode: "create" };

// Checked first: browser-provided "neural"/"online (natural)" voices (mainly
// Edge's built-in Microsoft voices) sound noticeably more human than the
// classic system voices below, and are still free — no API key involved.
const PREMIUM_YOUNG_FEMALE_VOICE_NAME_HINTS = [
  "aria", // Microsoft AriaNeural — young, bright American English
  "jenny", // Microsoft JennyNeural — warm American English
  "michelle", // Microsoft MichelleNeural
  "sunhi", // Microsoft SunHiNeural — Korean
  "jimin", // Microsoft JiMinNeural — Korean, younger-sounding
  "natural",
  "neural",
  "online (natural)",
];

const FEMALE_VOICE_NAME_HINTS = [
  "female",
  "여성",
  "samantha",
  "victoria",
  "karen",
  "moira",
  "tessa",
  "fiona",
  "zira",
  "susan",
  "linda",
  "heera",
  "salli",
  "joanna",
  "kimberly",
  "google us english",
  "google uk english female",
  "yuna",
  "heami",
  "google 한국의",
];

const MALE_VOICE_NAME_HINTS = [
  "male",
  "남성",
  "david",
  "mark",
  "daniel",
  "alex",
  "fred",
  "george",
  "james",
  "google uk english male",
  "injoon",
];

// speechSynthesis.getVoices() often returns an empty list on the very first
// call — most browsers load the voice list asynchronously and only fire
// "voiceschanged" once it's ready.
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) {
      resolve(existing);
      return;
    }
    const handleVoicesChanged = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    // Some browsers never fire voiceschanged; don't wait forever for them.
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 500);
  });
}

function pickCheerfulFemaleVoice(
  voices: SpeechSynthesisVoice[],
  langPrefix: string
): SpeechSynthesisVoice | undefined {
  const inLang = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  const candidates = inLang.length ? inLang : voices;
  const byPremiumName = candidates.find((v) =>
    PREMIUM_YOUNG_FEMALE_VOICE_NAME_HINTS.some((hint) => v.name.toLowerCase().includes(hint))
  );
  if (byPremiumName) return byPremiumName;
  const byFemaleName = candidates.find((v) =>
    FEMALE_VOICE_NAME_HINTS.some((hint) => v.name.toLowerCase().includes(hint))
  );
  if (byFemaleName) return byFemaleName;
  const notObviouslyMale = candidates.find(
    (v) => !MALE_VOICE_NAME_HINTS.some((hint) => v.name.toLowerCase().includes(hint))
  );
  return notObviouslyMale ?? candidates[0];
}

export default function Home() {
  const [policies, setPolicies] = useState<PolicyDTO[]>([]);
  const [prospects, setProspects] = useState<ProspectDTO[]>([]);
  const [columns, setColumns] = useState<ColumnDTO[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItemDTO[]>([]);
  const [licenses, setLicenses] = useState<LicenseCertDTO[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [navOpen, setNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dateStr, setDateStr] = useState("");

  const [reviewUnselected, setReviewUnselected] = useState<Set<number>>(new Set());
  const [annivUnselected, setAnnivUnselected] = useState<Set<number>>(new Set());

  const [personModal, setPersonModal] = useState<PersonModalState>({ mode: "closed" });
  const [policyModal, setPolicyModal] = useState<PolicyModalState>({ mode: "closed" });
  const [prospectModal, setProspectModal] = useState<ProspectModalState>({ mode: "closed" });
  const [columnModal, setColumnModal] = useState<ColumnModalState>({ mode: "closed" });
  const [knowledgeItemModal, setKnowledgeItemModal] = useState<KnowledgeItemModalState>({
    mode: "closed",
  });
  const [licenseCertModal, setLicenseCertModal] = useState<LicenseCertModalState>({
    mode: "closed",
  });

  const spokenGreetingRef = useRef(false);

  async function speakGreeting() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const voices = await loadVoices();

    // A warm, conversational delivery rather than a robotic-cheerful one:
    // a young female voice where available (preferring a browser-native
    // "neural"/"natural" voice, which sounds far more human than the classic
    // system voices), a near-normal pace, and only a slight pitch lift.
    const en = new SpeechSynthesisUtterance("Good morning, Chanwoo!");
    en.lang = "en-US";
    en.pitch = 1.08;
    en.rate = 0.98;
    const enVoice = pickCheerfulFemaleVoice(voices, "en");
    if (enVoice) en.voice = enVoice;

    const ko = new SpeechSynthesisUtterance("오늘 챙겨야 할 사람과 일이 정리되어 있습니다.");
    ko.lang = "ko-KR";
    ko.pitch = 1.08;
    ko.rate = 0.98;
    const koVoice = pickCheerfulFemaleVoice(voices, "ko");
    if (koVoice) ko.voice = koVoice;

    // Queued utterances play back to back, so each segment is spoken with
    // its own language's voice instead of one voice mispronouncing the other.
    window.speechSynthesis.speak(en);
    window.speechSynthesis.speak(ko);
  }

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

    // Chrome silently drops speechSynthesis.speak() calls made before the
    // page has seen any user gesture, and whether that blocks a given load
    // is inconsistent — so rather than call it directly here, wait for the
    // user's very first click/tap/keypress anywhere on the page (which
    // counts as a gesture) and speak then. In practice this fires the
    // instant they start using the app. The 🔊 button next to the greeting
    // still works any time afterward for a replay.
    if (!spokenGreetingRef.current) {
      spokenGreetingRef.current = true;
      const speakOnFirstInteraction = () => {
        speakGreeting();
      };
      const interactionEvents: (keyof DocumentEventMap)[] = ["pointerdown", "keydown"];
      interactionEvents.forEach((ev) =>
        document.addEventListener(ev, speakOnFirstInteraction, { once: true })
      );
      return () => {
        interactionEvents.forEach((ev) =>
          document.removeEventListener(ev, speakOnFirstInteraction)
        );
      };
    }
  }, []);

  const loadAll = useCallback(async () => {
    const [pol, p, col, know, lic, cal] = await Promise.all([
      fetch("/api/policies").then((r) => r.json()),
      fetch("/api/prospects").then((r) => r.json()),
      fetch("/api/columns").then((r) => r.json()),
      fetch("/api/knowledge-items").then((r) => r.json()),
      fetch("/api/licenses").then((r) => r.json()),
      fetch("/api/calendar-events").then((r) => r.json()),
    ]);
    setPolicies(pol);
    setProspects(p);
    setColumns(col);
    setKnowledgeItems(know);
    setLicenses(lic);
    setCalendarEvents(cal);
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

  const handleKnowledgeItemSaved = useCallback((updated: KnowledgeItemDTO) => {
    setKnowledgeItems((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
  }, []);

  const handleKnowledgeItemCreated = useCallback((created: KnowledgeItemDTO) => {
    setKnowledgeItems((prev) => [...prev, created]);
  }, []);

  const handleKnowledgeItemDeleted = useCallback((id: number) => {
    setKnowledgeItems((prev) => prev.filter((k) => k.id !== id));
  }, []);

  const handleLicenseCertSaved = useCallback((updated: LicenseCertDTO) => {
    setLicenses((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }, []);

  const handleLicenseCertCreated = useCallback((created: LicenseCertDTO) => {
    setLicenses((prev) => [...prev, created]);
  }, []);

  const handleLicenseCertDeleted = useCallback((id: number) => {
    setLicenses((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleCalendarEventCreate = useCallback(
    async (body: { date: string; title: string; note: string | null }) => {
      const res = await fetch("/api/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        alert("일정 추가에 실패했습니다.");
        return;
      }
      const created: CalendarEventDTO = await res.json();
      setCalendarEvents((prev) => [...prev, created]);
    },
    []
  );

  const handleCalendarEventUpdate = useCallback(
    async (id: number, body: { title: string; note: string | null }) => {
      const res = await fetch(`/api/calendar-events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        alert("일정 수정에 실패했습니다.");
        return;
      }
      const updated: CalendarEventDTO = await res.json();
      setCalendarEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    },
    []
  );

  const handleCalendarEventDelete = useCallback(async (id: number) => {
    const res = await fetch(`/api/calendar-events/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("일정 삭제에 실패했습니다.");
      return;
    }
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setSearch("");
    setNavOpen(false);
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

  const filteredKnowledgeItems = useMemo(() => {
    const f = search.toLowerCase();
    return knowledgeItems.filter(
      (k) =>
        !f ||
        k.title.toLowerCase().includes(f) ||
        (k.category || "").toLowerCase().includes(f)
    );
  }, [knowledgeItems, search]);

  const filteredLicenses = useMemo(() => {
    const f = search.toLowerCase();
    return licenses.filter(
      (l) =>
        !f ||
        l.title.toLowerCase().includes(f) ||
        l.category.toLowerCase().includes(f) ||
        (l.issuer || "").toLowerCase().includes(f)
    );
  }, [licenses, search]);

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

  function toggleReviewSelect(id: number) {
    setReviewUnselected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAnnivSelect(id: number) {
    setAnnivUnselected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const reviewEmails = useMemo(
    () =>
      Array.from(
        new Set(
          reviewItems.filter((p) => !reviewUnselected.has(p.id) && p.email).map((p) => p.email as string)
        )
      ),
    [reviewItems, reviewUnselected]
  );
  const annivEmails = useMemo(
    () =>
      Array.from(
        new Set(
          annivItems.filter((p) => !annivUnselected.has(p.id) && p.email).map((p) => p.email as string)
        )
      ),
    [annivItems, annivUnselected]
  );

  const kpisTop = [
    { n: uniquePeople, l: "Total Client", cls: "" },
    { n: policies.length, l: "Total Policy", cls: "" },
    { n: prospects.length, l: "Potential Client", cls: "accent" },
  ];
  const kpisBottom = [
    { n: weekAnniv, l: "Weekly Anniversary", cls: "accent" },
    { n: reviewCount, l: "Attention", cls: "danger" },
  ];

  return (
    <div className="app">
      <div className="sidebar">
        <div className="logo">
          Financial Relationship <span className="logo-os">OS</span>
        </div>
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

      <div className="topbar">
        <button
          type="button"
          className="topbar-bar"
          onClick={() => setNavOpen((v) => !v)}
          aria-expanded={navOpen}
        >
          <span className="topbar-current">
            {NAV_ITEMS.find((i) => i.tab === activeTab)?.label}
          </span>
          <svg
            className={`topbar-chevron${navOpen ? " open" : ""}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {navOpen && (
          <div className="topbar-dropdown">
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
        )}
      </div>

      <div className="main">
        <div className="searchbar">
          <svg
            className="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="고객, 잠재고객, 칼럼, 지식 창고, 자격증 이름으로 검색..."
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
                <div className="greeting">
                  <span aria-hidden="true">☀️</span> Good Morning, Chanwoo
                  <button
                    type="button"
                    className="greeting-speak-btn"
                    onClick={speakGreeting}
                    aria-label="인사말 다시 듣기"
                    title="다시 듣기"
                  >
                    🔊
                  </button>
                </div>
                <div className="greeting-sub">오늘 챙겨야 할 사람과 일이 정리되어 있습니다.</div>
                <div className="today-top-row">
                  <div className="today-kpi-col">
                    <div className="kpi-grid">
                      {kpisTop.map((k) => (
                        <div key={k.l} className={`kpi ${k.cls}`}>
                          <div className="n">{k.n}</div>
                          <div className="l">{k.l}</div>
                        </div>
                      ))}
                    </div>
                    <div className="kpi-grid">
                      {kpisBottom.map((k) => (
                        <div key={k.l} className={`kpi ${k.cls}`}>
                          <div className="n">{k.n}</div>
                          <div className="l">{k.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="calendar-section">
                    <Calendar
                      policies={policies}
                      events={calendarEvents}
                      onOpenPerson={(id) => setPersonModal({ mode: "edit", id })}
                      onCreateEvent={handleCalendarEventCreate}
                      onUpdateEvent={handleCalendarEventUpdate}
                      onDeleteEvent={handleCalendarEventDelete}
                    />
                  </div>
                </div>
                <div className="two-col">
                  <div className="section">
                    <div className="section-title-row">
                      <div className="section-title">검토 필요</div>
                      <button
                        className="btn-mini"
                        disabled={reviewEmails.length === 0}
                        onClick={() => {
                          window.open(buildGmailComposeUrl(reviewEmails), "_blank");
                        }}
                      >
                        이메일 보내기 ({reviewEmails.length})
                      </button>
                    </div>
                    {reviewItems.length ? (
                      reviewItems.map((p) => (
                        <PolicyRow
                          key={p.id}
                          policy={p}
                          onOpenPerson={(id) => setPersonModal({ mode: "edit", id })}
                          onOpenPolicy={(id) => setPolicyModal({ mode: "edit", id })}
                          onSaved={handlePolicySaved}
                          selected={!reviewUnselected.has(p.id)}
                          onToggleSelect={() => toggleReviewSelect(p.id)}
                          compact
                        />
                      ))
                    ) : (
                      <div className="empty">검토 필요 항목 없음</div>
                    )}
                  </div>
                  <div className="section">
                    <div className="section-title-row">
                      <div className="section-title">다가오는 Anniversary (30일 이내)</div>
                      <button
                        className="btn-mini"
                        disabled={annivEmails.length === 0}
                        onClick={() => {
                          window.open(buildGmailComposeUrl(annivEmails), "_blank");
                        }}
                      >
                        이메일 보내기 ({annivEmails.length})
                      </button>
                    </div>
                    {annivItems.length ? (
                      annivItems.map((p) => (
                        <PolicyRow
                          key={p.id}
                          policy={p}
                          onOpenPerson={(id) => setPersonModal({ mode: "edit", id })}
                          onOpenPolicy={(id) => setPolicyModal({ mode: "edit", id })}
                          onSaved={handlePolicySaved}
                          selected={!annivUnselected.has(p.id)}
                          onToggleSelect={() => toggleAnnivSelect(p.id)}
                          compact
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
                    onPolicyDeleted={handlePolicyDeleted}
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
                    onDeleted={handleProspectDeleted}
                  />
                ) : (
                  <div className="empty">검색 결과 없음</div>
                )}
              </div>
            )}

            {activeTab === "calendar" && (
              <div className="tab-panel active">
                <div className="section-title-row">
                  <div className="section-title">Calendar</div>
                </div>
                <div className="calendar-page calendar-page-year">
                  <Calendar
                    policies={policies}
                    events={calendarEvents}
                    onOpenPerson={(id) => setPersonModal({ mode: "edit", id })}
                    onCreateEvent={handleCalendarEventCreate}
                    onUpdateEvent={handleCalendarEventUpdate}
                    onDeleteEvent={handleCalendarEventDelete}
                    yearView
                  />
                </div>
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
                        onDeleted={handleColumnDeleted}
                      />
                    ))
                  ) : (
                    <div className="empty">검색 결과 없음</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "knowledge" && (
              <div className="tab-panel active">
                <div className="section-title-row">
                  <div className="section-title">Knowledge Vault · {filteredKnowledgeItems.length}건</div>
                  <button
                    className="btn-mini"
                    onClick={() => setKnowledgeItemModal({ mode: "create" })}
                  >
                    + 새 항목
                  </button>
                </div>
                {filteredKnowledgeItems.length ? (
                  <KnowledgeItemTable
                    items={filteredKnowledgeItems}
                    onOpen={(id) => setKnowledgeItemModal({ mode: "edit", id })}
                    onDeleted={handleKnowledgeItemDeleted}
                  />
                ) : (
                  <div className="empty">검색 결과 없음</div>
                )}
              </div>
            )}

            {activeTab === "licenses" && (
              <div className="tab-panel active">
                <div className="section-title-row">
                  <div className="section-title">License & Certificate · {filteredLicenses.length}건</div>
                  <button
                    className="btn-mini"
                    onClick={() => setLicenseCertModal({ mode: "create" })}
                  >
                    + 새 항목
                  </button>
                </div>
                {filteredLicenses.length ? (
                  <LicenseCertTable
                    items={filteredLicenses}
                    onOpen={(id) => setLicenseCertModal({ mode: "edit", id })}
                    onDeleted={handleLicenseCertDeleted}
                  />
                ) : (
                  <div className="empty">검색 결과 없음</div>
                )}
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
      {knowledgeItemModal.mode !== "closed" && (
        <KnowledgeItemModal
          itemId={knowledgeItemModal.mode === "edit" ? knowledgeItemModal.id : null}
          onClose={() => setKnowledgeItemModal({ mode: "closed" })}
          onSaved={handleKnowledgeItemSaved}
          onCreated={handleKnowledgeItemCreated}
          onDeleted={handleKnowledgeItemDeleted}
        />
      )}
      {licenseCertModal.mode !== "closed" && (
        <LicenseCertModal
          itemId={licenseCertModal.mode === "edit" ? licenseCertModal.id : null}
          onClose={() => setLicenseCertModal({ mode: "closed" })}
          onSaved={handleLicenseCertSaved}
          onCreated={handleLicenseCertCreated}
          onDeleted={handleLicenseCertDeleted}
        />
      )}
    </div>
  );
}

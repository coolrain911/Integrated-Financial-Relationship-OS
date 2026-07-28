"use client";

import { useMemo, useState } from "react";
import type { CalendarEventDTO, PolicyDTO } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  let m = month + delta;
  let y = year;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  return { year: y, month: m };
}

export function Calendar({
  policies,
  events,
  onOpenPerson,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  monthCount = 1,
  yearView = false,
}: {
  policies: PolicyDTO[];
  events: CalendarEventDTO[];
  onOpenPerson: (personId: number) => void;
  onCreateEvent: (body: { date: string; title: string; note: string | null }) => Promise<void>;
  onUpdateEvent: (id: number, body: { title: string; note: string | null }) => Promise<void>;
  onDeleteEvent: (id: number) => Promise<void>;
  monthCount?: number;
  /** Show all 12 months of viewYear at once (a diary-style year overview),
   * with prev/next paging by year instead of by month. */
  yearView?: boolean;
}) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");

  const annivByMonthDay = useMemo(() => {
    const map = new Map<string, PolicyDTO[]>();
    policies.forEach((p) => {
      if (!p.issueDate) return;
      const key = p.issueDate.slice(5, 10); // "MM-DD"
      const list = map.get(key);
      if (list) list.push(p);
      else map.set(key, [p]);
    });
    return map;
  }, [policies]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventDTO[]>();
    events.forEach((e) => {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    });
    return map;
  }, [events]);

  function shiftMonth(delta: number) {
    const next = addMonths(viewYear, viewMonth, delta);
    setViewYear(next.year);
    setViewMonth(next.month);
    setSelectedDate(null);
    setEditingId(null);
  }

  function shiftYear(delta: number) {
    setViewYear((y) => y + delta);
    setSelectedDate(null);
    setEditingId(null);
  }

  const todayStr = ymd(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const selectedAnniv = selectedDate ? annivByMonthDay.get(selectedDate.slice(5, 10)) ?? [] : [];
  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  async function submitNewEvent() {
    if (!selectedDate || !newTitle.trim()) return;
    await onCreateEvent({ date: selectedDate, title: newTitle.trim(), note: newNote.trim() || null });
    setNewTitle("");
    setNewNote("");
  }

  function startEdit(ev: CalendarEventDTO) {
    setEditingId(ev.id);
    setEditTitle(ev.title);
    setEditNote(ev.note ?? "");
  }

  async function submitEdit() {
    if (editingId === null || !editTitle.trim()) return;
    await onUpdateEvent(editingId, { title: editTitle.trim(), note: editNote.trim() || null });
    setEditingId(null);
  }

  async function removeEvent(id: number) {
    if (!confirm("Delete this event?")) return;
    await onDeleteEvent(id);
  }

  const months = useMemo(() => {
    return Array.from({ length: monthCount }, (_, i) => addMonths(viewYear, viewMonth, i));
  }, [viewYear, viewMonth, monthCount]);

  function renderMonth(year: number, month: number) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

    return (
      <div
        className={`calendar-month${isCurrentMonth ? " calendar-month-current" : ""}`}
        key={`${year}-${month}`}
      >
        <div className="calendar-title">
          {MONTH_NAMES[month - 1]} {year}
        </div>
        <div className="calendar-grid">
          {WEEKDAYS.map((w) => (
            <div key={w} className="calendar-weekday">
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            if (d === null) {
              return <div key={`blank-${i}`} className="calendar-cell calendar-cell-empty" />;
            }
            const dateStr = ymd(year, month, d);
            const monthDay = dateStr.slice(5, 10);
            const hasAnniv = annivByMonthDay.has(monthDay);
            const hasEvent = eventsByDate.has(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            return (
              <div
                key={dateStr}
                className={`calendar-cell${isToday ? " today" : ""}${isSelected ? " selected" : ""}`}
                onClick={() => {
                  setSelectedDate(dateStr);
                  setEditingId(null);
                }}
              >
                <span className="calendar-day-num">{d}</span>
                <span className="calendar-dots">
                  {hasAnniv && <span className="calendar-dot dot-anniv" title="Policy anniversary" />}
                  {hasEvent && <span className="calendar-dot dot-event" title="Event" />}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="calendar">
      {yearView ? (
        <>
          <div className="calendar-year-header">
            <button className="calendar-nav calendar-nav-year" onClick={() => shiftYear(-1)}>
              ‹
            </button>
            <div className="calendar-year-title">{viewYear}</div>
            <button className="calendar-nav calendar-nav-year" onClick={() => shiftYear(1)}>
              ›
            </button>
          </div>
          <div className="calendar-year-grid">
            {Array.from({ length: 12 }, (_, i) => renderMonth(viewYear, i + 1))}
          </div>
        </>
      ) : (
        <div className="calendar-header">
          <button className="calendar-nav" onClick={() => shiftMonth(-1)}>
            ‹
          </button>
          <div className="calendar-months">
            {months.map(({ year, month }) => renderMonth(year, month))}
          </div>
          <button className="calendar-nav" onClick={() => shiftMonth(1)}>
            ›
          </button>
        </div>
      )}

      {selectedDate && (
        <div className="calendar-detail">
          <div className="calendar-detail-title">{selectedDate}</div>

          {selectedAnniv.length > 0 && (
            <div className="calendar-detail-section">
              <div className="calendar-detail-label">Policy Anniversary</div>
              {selectedAnniv.map((p) => (
                <div
                  key={p.id}
                  className="calendar-detail-item link-cell"
                  onClick={() => onOpenPerson(p.personId)}
                >
                  {p.lastName} {p.firstName} — {p.carrier || "-"} {p.policyNumber || ""}
                </div>
              ))}
            </div>
          )}

          <div className="calendar-detail-section">
            <div className="calendar-detail-label">Events</div>
            {selectedEvents.length === 0 && <div className="row-note">No events</div>}
            {selectedEvents.map((ev) =>
              editingId === ev.id ? (
                <div key={ev.id} className="calendar-edit-row">
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <input
                    placeholder="Note (optional)"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                  />
                  <button className="btn-mini" onClick={submitEdit}>
                    Save
                  </button>
                  <button className="btn-danger-mini" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div key={ev.id} className="calendar-event-row">
                  <div>
                    <div className="calendar-event-title">{ev.title}</div>
                    {ev.note && <div className="row-note">{ev.note}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-mini" onClick={() => startEdit(ev)}>
                      Edit
                    </button>
                    <button className="btn-danger-mini" onClick={() => removeEvent(ev.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          <div className="calendar-add-row">
            <input
              placeholder="New event title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <input
              placeholder="Note (optional)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <button className="btn-primary" disabled={!newTitle.trim()} onClick={submitNewEvent}>
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

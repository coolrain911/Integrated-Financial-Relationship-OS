"use client";

import { useState } from "react";
import type { ClientDTO } from "@/lib/types";
import { fmtMoney } from "@/lib/format";

function pillFor(c: { reviewed: boolean; needsReview: boolean; daysToAnniv: number | null }) {
  if (c.reviewed) return { cls: "success", label: "완료" };
  if (c.needsReview) return { cls: "danger", label: "검토 필요" };
  if (c.daysToAnniv !== null && c.daysToAnniv >= 0 && c.daysToAnniv <= 30) {
    return { cls: "warn", label: `D-${c.daysToAnniv}` };
  }
  return null;
}

export function ClientRow({
  client,
  onSaved,
}: {
  client: ClientDTO;
  onSaved: (updated: ClientDTO) => void;
}) {
  const [reviewed, setReviewed] = useState(client.reviewed);
  const [note, setNote] = useState(client.note ?? "");
  const [month, setMonth] = useState(client.birthdayMonth?.toString() ?? "");
  const [day, setDay] = useState(client.birthdayDay?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("저장 실패");
      const updated: ClientDTO = await res.json();
      onSaved(updated);
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const pill = pillFor({ reviewed, needsReview: client.needsReview, daysToAnniv: client.daysToAnniv });
  const meta = [client.carrier, client.product, fmtMoney(client.faceAmount)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="row-card">
      <div className="row-card-top">
        <div>
          <div className="row-name">{client.name}</div>
          <div className="row-meta">
            {meta}
            {client.phone ? ` · ${client.phone}` : ""}
          </div>
          {client.reviewReason && (
            <div className="row-note" style={{ color: "var(--danger)" }}>
              {client.reviewReason}
            </div>
          )}
        </div>
        {pill && <span className={`pill ${pill.cls}`}>{pill.label}</span>}
      </div>
      <div className="row-actions">
        <label className="row-check">
          <input
            type="checkbox"
            checked={reviewed}
            disabled={saving}
            onChange={(e) => {
              setReviewed(e.target.checked);
              patch({ reviewed: e.target.checked });
            }}
          />
          검토 완료
        </label>
        <span className="row-check">
          생일
          <input
            className="bday-input"
            type="number"
            min={1}
            max={12}
            placeholder="월"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            onBlur={() =>
              patch({
                birthdayMonth: month ? parseInt(month, 10) : null,
                birthdayDay: day ? parseInt(day, 10) : null,
              })
            }
          />
          /
          <input
            className="bday-input"
            type="number"
            min={1}
            max={31}
            placeholder="일"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            onBlur={() =>
              patch({
                birthdayMonth: month ? parseInt(month, 10) : null,
                birthdayDay: day ? parseInt(day, 10) : null,
              })
            }
          />
        </span>
        <input
          className="row-note-input"
          placeholder="메모 추가..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => patch({ note })}
        />
      </div>
    </div>
  );
}

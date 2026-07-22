"use client";

import { useState } from "react";
import type { PolicyDTO } from "@/lib/types";
import { fmtMoney } from "@/lib/format";

function pillFor(p: { reviewed: boolean; needsReview: boolean; daysToAnniv: number | null }) {
  if (p.reviewed) return { cls: "success", label: "완료" };
  if (p.needsReview) return { cls: "danger", label: "검토 필요" };
  if (p.daysToAnniv !== null && p.daysToAnniv >= 0 && p.daysToAnniv <= 30) {
    return { cls: "warn", label: `D-${p.daysToAnniv}` };
  }
  return null;
}

export function PolicyRow({
  policy,
  onOpenPerson,
  onOpenPolicy,
  onSaved,
}: {
  policy: PolicyDTO;
  onOpenPerson: (personId: number) => void;
  onOpenPolicy: (policyId: number) => void;
  onSaved: (updated: PolicyDTO) => void;
}) {
  const [reviewed, setReviewed] = useState(policy.reviewed);
  const [note, setNote] = useState(policy.note ?? "");
  const [saving, setSaving] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/policies/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("저장 실패");
      const updated: PolicyDTO = await res.json();
      onSaved(updated);
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const pill = pillFor({ reviewed, needsReview: policy.needsReview, daysToAnniv: policy.daysToAnniv });
  const meta = [policy.carrier, policy.product, fmtMoney(policy.deathBenefit)].filter(Boolean).join(" · ");

  return (
    <div className="row-card">
      <div className="row-card-top">
        <div>
          <div className="row-name link-cell" onClick={() => onOpenPerson(policy.personId)}>
            {policy.lastName} {policy.firstName}
          </div>
          <div className="row-meta link-cell" onClick={() => onOpenPolicy(policy.id)}>
            {meta}
          </div>
          {policy.reviewReason && (
            <div className="row-note" style={{ color: "var(--danger)" }}>
              {policy.reviewReason}
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

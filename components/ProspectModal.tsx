"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type { ProspectDTO } from "@/lib/types";
import { CONTACT_CHANNEL_PRESETS } from "@/lib/options";

export function ProspectModal({
  prospectId,
  onClose,
  onSaved,
  onConverted,
}: {
  prospectId: number;
  onClose: () => void;
  onSaved: (prospect: ProspectDTO) => void;
  onConverted: () => void;
}) {
  const [prospect, setProspect] = useState<ProspectDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [koreanName, setKoreanName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [categoryChoice, setCategoryChoice] = useState("");
  const [categoryCustom, setCategoryCustom] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/prospects/${prospectId}`);
      const data: ProspectDTO = await res.json();
      setProspect(data);
      setLastName(data.lastName ?? "");
      setFirstName(data.firstName ?? "");
      setKoreanName(data.koreanName ?? "");
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      const cat = data.category;
      if (cat && !CONTACT_CHANNEL_PRESETS.includes(cat as (typeof CONTACT_CHANNEL_PRESETS)[number])) {
        setCategoryChoice("기타");
        setCategoryCustom(cat);
      } else {
        setCategoryChoice(cat ?? "");
        setCategoryCustom("");
      }
      setNote(data.note ?? "");
      setLoading(false);
    })();
  }, [prospectId]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastName: lastName || null,
          firstName: firstName || null,
          koreanName: koreanName || null,
          email: email || null,
          phone: phone || null,
          category: categoryChoice === "기타" ? categoryCustom || null : categoryChoice || null,
          note: note || null,
        }),
      });
      if (!res.ok) throw new Error("저장 실패");
      const updated: ProspectDTO = await res.json();
      onSaved(updated);
      onClose();
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConvert() {
    setConverting(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/convert`, { method: "POST" });
      if (!res.ok) throw new Error("전환 실패");
      onConverted();
      onClose();
    } catch {
      alert("전환에 실패했습니다.");
      setConverting(false);
    }
  }

  return (
    <Modal title="잠재고객 정보" onClose={onClose}>
      {loading || !prospect ? (
        <div className="empty">불러오는 중...</div>
      ) : (
        <>
          <div className="form-grid">
            <label className="form-field">
              <span>성</span>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
            <label className="form-field">
              <span>이름</span>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label className="form-field">
              <span>한글명</span>
              <input value={koreanName} onChange={(e) => setKoreanName(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="form-field">
              <span>접촉경로</span>
              <select value={categoryChoice} onChange={(e) => setCategoryChoice(e.target.value)}>
                <option value="">미입력</option>
                {CONTACT_CHANNEL_PRESETS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            {categoryChoice === "기타" && (
              <label className="form-field">
                <span>접촉경로 (직접 입력)</span>
                <input value={categoryCustom} onChange={(e) => setCategoryCustom(e.target.value)} />
              </label>
            )}
            <label className="form-field form-field-wide">
              <span>주요 정보</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </label>
          </div>

          <div className="modal-actions" style={{ justifyContent: "space-between" }}>
            <button className="btn-mini" disabled={converting} onClick={handleConvert}>
              {converting ? "전환 중..." : "고객으로 전환"}
            </button>
            <button className="btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

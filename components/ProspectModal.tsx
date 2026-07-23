"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type { ProspectDTO } from "@/lib/types";
import { CONTACT_CHANNEL_PRESETS } from "@/lib/options";

export function ProspectModal({
  prospectId,
  onClose,
  onSaved,
  onCreated,
  onDeleted,
  onConverted,
}: {
  prospectId: number | null;
  onClose: () => void;
  onSaved: (prospect: ProspectDTO) => void;
  onCreated: (prospect: ProspectDTO) => void;
  onDeleted: (prospectId: number) => void;
  onConverted: () => void;
}) {
  const isNew = prospectId === null;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    if (isNew) return;
    (async () => {
      const res = await fetch(`/api/prospects/${prospectId}`);
      const data: ProspectDTO = await res.json();
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
  }, [prospectId, isNew]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        lastName: lastName || null,
        firstName: firstName || null,
        koreanName: koreanName || null,
        email: email || null,
        phone: phone || null,
        category: categoryChoice === "기타" ? categoryCustom || null : categoryChoice || null,
        note: note || null,
      };
      const res = await fetch(isNew ? "/api/prospects" : `/api/prospects/${prospectId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("저장 실패");
      const data: ProspectDTO = await res.json();
      if (isNew) {
        onCreated(data);
      } else {
        onSaved(data);
      }
      onClose();
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isNew) return;
    if (!confirm("이 잠재고객을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      onDeleted(prospectId);
      onClose();
    } catch {
      alert("삭제에 실패했습니다.");
      setDeleting(false);
    }
  }

  async function handleConvert() {
    if (isNew) return;
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
    <Modal title={isNew ? "새 잠재고객 추가" : "잠재고객 정보"} onClose={onClose}>
      {loading ? (
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
            <div style={{ display: "flex", gap: 8 }}>
              {!isNew && (
                <>
                  <button className="btn-mini" disabled={converting} onClick={handleConvert}>
                    {converting ? "전환 중..." : "고객으로 전환"}
                  </button>
                  <button className="btn-danger" disabled={deleting} onClick={handleDelete}>
                    {deleting ? "삭제 중..." : "삭제"}
                  </button>
                </>
              )}
            </div>
            <button className="btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

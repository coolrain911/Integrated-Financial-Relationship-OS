"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type { PersonDTO, PolicyDTO } from "@/lib/types";
import { GENDER_OPTIONS, OCCUPATION_PRESETS } from "@/lib/options";
import { computeAgeBracket } from "@/lib/mapping";

export function PersonModal({
  personId,
  onClose,
  onSaved,
  onCreated,
  onDeleted,
  onOpenPolicy,
  onAddPolicy,
}: {
  personId: number | null;
  onClose: () => void;
  onSaved: (person: PersonDTO) => void;
  onCreated: (person: PersonDTO) => void;
  onDeleted: (personId: number) => void;
  onOpenPolicy: (policyId: number) => void;
  onAddPolicy: (personId: number) => void;
}) {
  const isNew = personId === null;
  const [policies, setPolicies] = useState<PolicyDTO[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [occupationChoice, setOccupationChoice] = useState("");
  const [occupationCustom, setOccupationCustom] = useState("");
  const [medicare, setMedicare] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const res = await fetch(`/api/people/${personId}`);
      const data = await res.json();
      setPolicies(data.policies);
      setLastName(data.person.lastName ?? "");
      setFirstName(data.person.firstName ?? "");
      setGender(data.person.gender ?? "");
      setDob(data.person.dob ?? "");
      const occ: string | null = data.person.occupation;
      if (occ && !OCCUPATION_PRESETS.includes(occ as (typeof OCCUPATION_PRESETS)[number])) {
        setOccupationChoice("기타");
        setOccupationCustom(occ);
      } else {
        setOccupationChoice(occ ?? "");
        setOccupationCustom("");
      }
      setMedicare(Boolean(data.person.medicare));
      setEmail(data.person.email ?? "");
      setPhone(data.person.phone ?? "");
      setNote(data.person.note ?? "");
      setLoading(false);
    })();
  }, [personId, isNew]);

  async function handleSave() {
    if (!lastName.trim()) {
      alert("성을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        lastName,
        firstName: firstName || null,
        gender: gender || null,
        dob: dob || null,
        occupation: occupationChoice === "기타" ? occupationCustom || null : occupationChoice || null,
        medicare,
        email: email || null,
        phone: phone || null,
        note: note || null,
      };
      const res = await fetch(isNew ? "/api/people" : `/api/people/${personId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("저장 실패");
      const data = await res.json();
      if (isNew) {
        onCreated(data);
      } else {
        onSaved(data.person);
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
    if (!confirm("이 고객을 삭제하시겠습니까? 보유한 모든 정책도 함께 삭제됩니다.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/people/${personId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      onDeleted(personId);
      onClose();
    } catch {
      alert("삭제에 실패했습니다.");
      setDeleting(false);
    }
  }

  const ageBracket = computeAgeBracket(dob || null, new Date());

  return (
    <Modal title={isNew ? "새 고객 추가" : "고객 정보"} onClose={onClose}>
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
              <span>성별</span>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">미입력</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>생년월일</span>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </label>
            <label className="form-field">
              <span>연령대</span>
              <input value={ageBracket ?? "-"} disabled />
            </label>
            <label className="form-field">
              <span>직업</span>
              <select value={occupationChoice} onChange={(e) => setOccupationChoice(e.target.value)}>
                <option value="">미입력</option>
                {OCCUPATION_PRESETS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            {occupationChoice === "기타" && (
              <label className="form-field">
                <span>직업 (직접 입력)</span>
                <input value={occupationCustom} onChange={(e) => setOccupationCustom(e.target.value)} />
              </label>
            )}
            <label className="form-field form-field-checkbox">
              <input type="checkbox" checked={medicare} onChange={(e) => setMedicare(e.target.checked)} />
              <span>Medicare 해당</span>
            </label>
            <label className="form-field">
              <span>이메일</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="form-field">
              <span>전화</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="form-field form-field-wide">
              <span>기타 중요 정보</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </label>
          </div>

          {!isNew && (
            <>
              <div className="modal-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>보유 정책 ({policies.length}건)</span>
                <button className="btn-mini" onClick={() => onAddPolicy(personId)}>
                  + 정책 추가
                </button>
              </div>
              {policies.length ? (
                policies.map((p) => (
                  <div key={p.id} className="policy-mini-row" onClick={() => onOpenPolicy(p.id)}>
                    <span className="policy-mini-num">{p.policyNumber || "(정책번호 없음)"}</span>
                    <span className="policy-mini-meta">
                      {p.carrier} · {p.product} · {p.category}
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty">보유 정책 없음</div>
              )}
            </>
          )}

          <div className="modal-actions" style={{ justifyContent: isNew ? "flex-end" : "space-between" }}>
            {!isNew && (
              <button className="btn-danger" disabled={deleting} onClick={handleDelete}>
                {deleting ? "삭제 중..." : "고객 삭제"}
              </button>
            )}
            <button className="btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

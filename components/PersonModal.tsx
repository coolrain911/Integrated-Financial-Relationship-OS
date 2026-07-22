"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type { PersonDTO, PolicyDTO } from "@/lib/types";
import { GENDER_OPTIONS, OCCUPATION_PRESETS } from "@/lib/options";

export function PersonModal({
  personId,
  onClose,
  onSaved,
  onOpenPolicy,
}: {
  personId: number;
  onClose: () => void;
  onSaved: (person: PersonDTO) => void;
  onOpenPolicy: (policyId: number) => void;
}) {
  const [person, setPerson] = useState<PersonDTO | null>(null);
  const [policies, setPolicies] = useState<PolicyDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    (async () => {
      const res = await fetch(`/api/people/${personId}`);
      const data = await res.json();
      setPerson(data.person);
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
  }, [personId]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/people/${personId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastName,
          firstName: firstName || null,
          gender: gender || null,
          dob: dob || null,
          occupation: occupationChoice === "기타" ? occupationCustom || null : occupationChoice || null,
          medicare,
          email: email || null,
          phone: phone || null,
          note: note || null,
        }),
      });
      if (!res.ok) throw new Error("저장 실패");
      const data = await res.json();
      onSaved(data.person);
      onClose();
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="고객 정보" onClose={onClose}>
      {loading || !person ? (
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
              <input value={person.ageBracket ?? "-"} disabled />
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

          <div className="modal-section-title">보유 정책 ({policies.length}건)</div>
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

          <div className="modal-actions">
            <button className="btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

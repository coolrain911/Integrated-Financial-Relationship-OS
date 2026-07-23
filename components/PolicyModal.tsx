"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type { PolicyDTO } from "@/lib/types";
import { computePeriodYears } from "@/lib/mapping";
import {
  ANNUITY_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  LIFE_TYPE_OPTIONS,
  OPTION_TYPE_OPTIONS,
  PREMIUM_METHOD_OPTIONS,
} from "@/lib/options";

function toInputStr(v: number | string | null): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export function PolicyModal({
  policyId,
  personId,
  onClose,
  onSaved,
  onCreated,
  onDeleted,
}: {
  policyId: number | null;
  personId?: number;
  onClose: () => void;
  onSaved: (policy: PolicyDTO) => void;
  onCreated: (policy: PolicyDTO) => void;
  onDeleted: (policyId: number) => void;
}) {
  const isNew = policyId === null;
  const [policy, setPolicy] = useState<PolicyDTO | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [policyNumber, setPolicyNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [carrier, setCarrier] = useState("");
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState<string>("Life");
  const [lifeType, setLifeType] = useState("");
  const [optionType, setOptionType] = useState("");
  const [deathBenefit, setDeathBenefit] = useState("");
  const [totalPremium, setTotalPremium] = useState("");
  const [premiumMethod, setPremiumMethod] = useState("");
  const [annualPremium, setAnnualPremium] = useState("");
  const [annuityType, setAnnuityType] = useState("");
  const [initialPremium, setInitialPremium] = useState("");
  const [additionalPremium, setAdditionalPremium] = useState("");
  const [accountValue, setAccountValue] = useState("");
  const [surrenderValue, setSurrenderValue] = useState("");
  const [loanOrWithdrawal, setLoanOrWithdrawal] = useState(false);
  const [surrendered, setSurrendered] = useState(false);
  const [needsAttention, setNeedsAttention] = useState(false);
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const res = await fetch(`/api/policies/${policyId}`);
      const data: PolicyDTO = await res.json();
      setPolicy(data);
      setPolicyNumber(data.policyNumber ?? "");
      setIssueDate(data.issueDate ?? "");
      setCarrier(data.carrier ?? "");
      setProduct(data.product ?? "");
      setCategory(data.category);
      setLifeType(data.lifeType ?? "");
      setOptionType(data.optionType ?? "");
      setDeathBenefit(toInputStr(data.deathBenefit));
      setTotalPremium(toInputStr(data.totalPremium));
      setPremiumMethod(data.premiumMethod ?? "");
      setAnnualPremium(toInputStr(data.annualPremium));
      setAnnuityType(data.annuityType ?? "");
      setInitialPremium(toInputStr(data.initialPremium));
      setAdditionalPremium(toInputStr(data.additionalPremium));
      setAccountValue(toInputStr(data.accountValue));
      setSurrenderValue(toInputStr(data.surrenderValue));
      setLoanOrWithdrawal(Boolean(data.loanOrWithdrawal));
      setSurrendered(data.surrendered);
      setNeedsAttention(data.needsAttention);
      setComment(data.comment ?? "");
      setNote(data.note ?? "");
      setReviewed(data.reviewed);
      setLoading(false);
    })();
  }, [policyId, isNew]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        policyNumber: policyNumber || null,
        issueDate: issueDate || null,
        carrier: carrier || null,
        product: product || null,
        category,
        lifeType: category === "Life" ? lifeType || null : null,
        optionType: category === "Life" ? optionType || null : null,
        deathBenefit: category === "Life" ? deathBenefit || null : null,
        totalPremium: category === "Life" ? totalPremium || null : null,
        premiumMethod: category === "Life" ? premiumMethod || null : null,
        annualPremium: category === "Life" ? annualPremium || null : null,
        annuityType: category === "Annuity" ? annuityType || null : null,
        initialPremium: category === "Annuity" ? initialPremium || null : null,
        additionalPremium: category === "Annuity" ? additionalPremium || null : null,
        accountValue: accountValue || null,
        surrenderValue: surrenderValue || null,
        loanOrWithdrawal,
        comment: comment || null,
        note: note || null,
      };
      const res = await fetch(isNew ? "/api/policies" : `/api/policies/${policyId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isNew ? { personId, ...payload } : { ...payload, surrendered, needsAttention, reviewed }),
      });
      if (!res.ok) throw new Error("저장 실패");
      const data: PolicyDTO = await res.json();
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
    if (!confirm("이 정책을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/policies/${policyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
      onDeleted(policyId);
      onClose();
    } catch {
      alert("삭제에 실패했습니다.");
      setDeleting(false);
    }
  }

  const periodYears = computePeriodYears(issueDate || null, new Date());

  return (
    <Modal title={isNew ? "새 정책 추가" : "정책 정보"} onClose={onClose}>
      {loading ? (
        <div className="empty">불러오는 중...</div>
      ) : (
        <>
          {policy && (
            <div className="modal-subtitle">
              {policy.lastName} {policy.firstName}
            </div>
          )}
          <div className="form-grid">
            <label className="form-field">
              <span>Policy Number</span>
              <input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Issued Date</span>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Period</span>
              <input value={periodYears !== null ? `${periodYears}년차` : "-"} disabled />
            </label>
            <label className="form-field">
              <span>회사 (Carrier)</span>
              <input value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            </label>
            <label className="form-field">
              <span>플랜 이름 (Product)</span>
              <input value={product} onChange={(e) => setProduct(e.target.value)} />
            </label>
            <label className="form-field">
              <span>구분</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {category === "Life" ? (
            <>
              <div className="modal-section-title">Life 상세</div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Type</span>
                  <select value={lifeType} onChange={(e) => setLifeType(e.target.value)}>
                    <option value="">미입력</option>
                    {LIFE_TYPE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Option</span>
                  <select value={optionType} onChange={(e) => setOptionType(e.target.value)}>
                    <option value="">미입력</option>
                    {OPTION_TYPE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Death Benefit</span>
                  <input value={deathBenefit} onChange={(e) => setDeathBenefit(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Total Premium</span>
                  <input value={totalPremium} onChange={(e) => setTotalPremium(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Premium Method</span>
                  <select value={premiumMethod} onChange={(e) => setPremiumMethod(e.target.value)}>
                    <option value="">미입력</option>
                    {PREMIUM_METHOD_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Annual Premium</span>
                  <input value={annualPremium} onChange={(e) => setAnnualPremium(e.target.value)} />
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="modal-section-title">Annuity 상세</div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Type</span>
                  <select value={annuityType} onChange={(e) => setAnnuityType(e.target.value)}>
                    <option value="">미입력</option>
                    {ANNUITY_TYPE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>Initial Premium</span>
                  <input value={initialPremium} onChange={(e) => setInitialPremium(e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Additional Premium</span>
                  <input value={additionalPremium} onChange={(e) => setAdditionalPremium(e.target.value)} />
                </label>
              </div>
            </>
          )}

          <div className="modal-section-title">공통</div>
          <div className="form-grid">
            <label className="form-field">
              <span>Account Value</span>
              <input value={accountValue} onChange={(e) => setAccountValue(e.target.value)} />
            </label>
            <label className="form-field">
              <span>Surrender Value</span>
              <input value={surrenderValue} onChange={(e) => setSurrenderValue(e.target.value)} />
            </label>
            <label className="form-field form-field-checkbox">
              <input
                type="checkbox"
                checked={loanOrWithdrawal}
                onChange={(e) => setLoanOrWithdrawal(e.target.checked)}
              />
              <span>Loan / Withdrawal 있음</span>
            </label>
            {!isNew && (
              <>
                <label className="form-field form-field-checkbox">
                  <input
                    type="checkbox"
                    checked={surrendered}
                    onChange={(e) => setSurrendered(e.target.checked)}
                  />
                  <span>계약해지</span>
                </label>
                <label className="form-field form-field-checkbox">
                  <input
                    type="checkbox"
                    checked={needsAttention}
                    onChange={(e) => setNeedsAttention(e.target.checked)}
                  />
                  <span>주의요망</span>
                </label>
                <label className="form-field form-field-checkbox">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                  />
                  <span>검토 완료</span>
                </label>
              </>
            )}
            <label className="form-field form-field-wide">
              <span>기타 주요 변동 사항</span>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
            </label>
            <label className="form-field form-field-wide">
              <span>메모</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </label>
          </div>

          {policy?.reviewReason && (
            <div className="row-note" style={{ color: "var(--danger)" }}>
              검토 필요 사유: {policy.reviewReason}
            </div>
          )}

          <div className="modal-actions" style={{ justifyContent: isNew ? "flex-end" : "space-between" }}>
            {!isNew && (
              <button className="btn-danger" disabled={deleting} onClick={handleDelete}>
                {deleting ? "삭제 중..." : "정책 삭제"}
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

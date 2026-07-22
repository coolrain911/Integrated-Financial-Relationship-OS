"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import type { PolicyDTO } from "@/lib/types";
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
  onClose,
  onSaved,
}: {
  policyId: number;
  onClose: () => void;
  onSaved: (policy: PolicyDTO) => void;
}) {
  const [policy, setPolicy] = useState<PolicyDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
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
      setComment(data.comment ?? "");
      setNote(data.note ?? "");
      setReviewed(data.reviewed);
      setLoading(false);
    })();
  }, [policyId]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/policies/${policyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
          surrendered,
          comment: comment || null,
          note: note || null,
          reviewed,
        }),
      });
      if (!res.ok) throw new Error("저장 실패");
      const updated: PolicyDTO = await res.json();
      onSaved(updated);
      onClose();
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="정책 정보" onClose={onClose}>
      {loading || !policy ? (
        <div className="empty">불러오는 중...</div>
      ) : (
        <>
          <div className="modal-subtitle">
            {policy.lastName} {policy.firstName}
          </div>
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
              <input value={policy.periodYears !== null ? `${policy.periodYears}년차` : "-"} disabled />
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
            <label className="form-field form-field-checkbox">
              <input
                type="checkbox"
                checked={surrendered}
                onChange={(e) => setSurrendered(e.target.checked)}
              />
              <span>Surrendered (해지됨)</span>
            </label>
            <label className="form-field form-field-checkbox">
              <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
              <span>검토 완료</span>
            </label>
            <label className="form-field form-field-wide">
              <span>기타 주요 변동 사항</span>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
            </label>
            <label className="form-field form-field-wide">
              <span>메모</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </label>
          </div>

          {policy.reviewReason && (
            <div className="row-note" style={{ color: "var(--danger)" }}>
              검토 필요 사유: {policy.reviewReason}
            </div>
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

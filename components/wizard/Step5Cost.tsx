'use client';

/**
 * Step 5: Cost — FOB-only cost review.
 *
 * Shows FOB cost breakdown (Materials + CMT + Overhead).
 * CMT and Overhead % are editable inline.
 * No shipping, duty, markup, or MOQ shown here.
 */

import { useEffect, useState, useCallback } from 'react';
import type { SubType } from '@/lib/db';
import { CMT_RANGES, OVERHEAD_EXPLANATION } from '@/lib/cost/materials';

interface CostBreakdown {
  materialsCost: number;
  cmt: number;
  overhead: number;
  fobCost: number;
}

interface CostSettings {
  cmt: number;
  overhead_pct: number;
}

interface Props {
  projectId: string;
  subType?: SubType;
  onCostChange?: () => void;
  onExportPdf?: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const SUB_TYPE_LABELS: Record<SubType, string> = {
  oversized_hoodie: 'Oversized Hoodie',
  pullover_hoodie:  'Pullover Hoodie',
  zip_hoodie:       'Zip Hoodie',
  unisex_hoodie:    'Unisex Hoodie',
  crewneck:         'Crewneck Sweatshirt',
  sweatpants:       'Sweatpants',
};

export default function Step5Cost({ projectId, subType, onCostChange, onExportPdf }: Props) {
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);
  const [settings, setSettings]   = useState<CostSettings>({ cmt: 4.00, overhead_pct: 12 });
  const [loading, setLoading]     = useState(true);

  // CMT drill-down state
  const [expandedCmt, setExpandedCmt]         = useState(false);
  const [cmtDraft, setCmtDraft]               = useState('');

  // Overhead inline edit state
  const [editingOverhead, setEditingOverhead] = useState(false);
  const [overheadDraft, setOverheadDraft]     = useState('');

  const [saving, setSaving] = useState(false);

  const fetchCost = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/cost`);
      if (!res.ok) return;
      const data = await res.json();
      setBreakdown({
        materialsCost: data.breakdown.materialsCost,
        cmt:           data.breakdown.cmt,
        overhead:      data.breakdown.overhead,
        fobCost:       data.breakdown.fobCost,
      });
      setSettings({
        cmt:          data.settings.cmt,
        overhead_pct: data.settings.overhead_pct,
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCost();
  }, [fetchCost]);

  async function patchCost(patch: Partial<CostSettings>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/cost`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        await fetchCost();
        onCostChange?.();
      }
    } finally {
      setSaving(false);
    }
  }

  function commitCmt() {
    const v = parseFloat(cmtDraft);
    if (!isNaN(v) && v > 0) {
      patchCost({ cmt: v });
      setExpandedCmt(false);
    }
  }

  function commitOverhead() {
    const v = parseFloat(overheadDraft);
    if (!isNaN(v) && v >= 0) patchCost({ overhead_pct: v });
    setEditingOverhead(false);
  }

  const cmtRange = subType ? CMT_RANGES[subType] : null;

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: '640px' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Step 5 — Cost Estimate</h2>
      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
        FOB cost — what it costs to produce one unit at the factory.
      </p>

      {loading ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Loading…</p>
      ) : breakdown ? (
        <>
          {/* FOB hero */}
          <div style={{
            padding: '1.25rem 1.5rem',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            background: 'var(--color-surface)',
          }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>
              FOB Cost Per Unit
            </p>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              lineHeight: 1,
              marginBottom: 0,
            }}>
              {fmt(breakdown.fobCost)}
            </p>
          </div>

          {/* Line items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.5rem' }}>

            {/* Materials */}
            <CostRow
              label="Materials"
              sub="From BOM"
              value={fmt(breakdown.materialsCost)}
            />

            {/* CMT — with drill-down expansion */}
            <div style={{ borderBottom: '1px solid var(--color-border)' }}>
              <CostRow
                label="CMT Labor"
                sub={subType ? `${SUB_TYPE_LABELS[subType]}${cmtRange ? ` · Range: $${cmtRange.min.toFixed(2)} – $${cmtRange.max.toFixed(2)}` : ''}` : undefined}
                value={
                  <EditableValue
                    value={fmt(breakdown.cmt)}
                    onEdit={() => { setCmtDraft(settings.cmt.toFixed(2)); setExpandedCmt(v => !v); }}
                    saving={saving}
                    editLabel={expandedCmt ? 'close' : 'edit'}
                  />
                }
                noBorder
              />
              {expandedCmt && (
                <div style={{
                  padding: '1rem 1.25rem 1.25rem',
                  background: 'var(--color-bg)',
                  borderTop: '1px solid var(--color-border)',
                }}>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                    What is CMT?
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0 0 0.875rem' }}>
                    Cut, Make, Trim — the factory&apos;s charge to produce your garment (labor only, not materials).
                    {subType && ` Estimate based on: ${SUB_TYPE_LABELS[subType]}, China / Asia production.`}
                  </p>
                  {cmtRange && (() => {
                    const low  = cmtRange.min;
                    const high = cmtRange.max;
                    const mid  = Math.round((low + high) / 2 * 100) / 100;
                    return (
                      <>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                          Industry range: <strong style={{ color: 'var(--color-text)' }}>${low.toFixed(2)} – ${high.toFixed(2)}</strong>
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                          {[
                            { label: `Low  $${low.toFixed(2)}`, val: low },
                            { label: `Mid  $${mid.toFixed(2)}`, val: mid },
                            { label: `High $${high.toFixed(2)}`, val: high },
                          ].map(({ label, val }) => (
                            <button
                              key={label}
                              onClick={() => { patchCost({ cmt: val }); setExpandedCmt(false); }}
                              disabled={saving}
                              style={{
                                padding: '0.375rem 0.875rem',
                                border: '1px solid var(--color-border)',
                                borderRadius: '5px',
                                background: Math.abs(settings.cmt - val) < 0.01 ? 'var(--color-accent)' : 'var(--color-surface)',
                                color: Math.abs(settings.cmt - val) < 0.01 ? '#fff' : 'var(--color-text)',
                                fontSize: '0.8125rem',
                                fontFamily: 'var(--font-mono)',
                                cursor: saving ? 'default' : 'pointer',
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Custom:</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>$</span>
                    <input
                      type="number"
                      step="0.25"
                      value={cmtDraft}
                      onChange={e => setCmtDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitCmt(); if (e.key === 'Escape') setExpandedCmt(false); }}
                      style={{
                        width: '80px',
                        padding: '0.25rem 0.375rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        fontFamily: 'var(--font-mono)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                      }}
                    />
                    <button onClick={commitCmt} style={smallBtnStyle}>✓ Apply</button>
                  </div>
                </div>
              )}
            </div>

            {/* Overhead */}
            <CostRow
              label={`Factory Overhead (${settings.overhead_pct}%)`}
              sub="QC, samples, factory margin · industry standard 10–15%"
              value={
                editingOverhead ? (
                  <InlineEdit
                    value={overheadDraft}
                    onChange={setOverheadDraft}
                    onCommit={commitOverhead}
                    onCancel={() => setEditingOverhead(false)}
                    suffix="%"
                  />
                ) : (
                  <EditableValue
                    value={fmt(breakdown.overhead)}
                    onEdit={() => { setOverheadDraft(settings.overhead_pct.toFixed(1)); setEditingOverhead(true); }}
                    saving={saving}
                  />
                )
              }
            />
          </div>

          {/* Explanation */}
          <div style={{
            padding: '1rem 1.25rem',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            marginBottom: '2rem',
          }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
              <strong style={{ color: 'var(--color-text)' }}>About this estimate:</strong>{' '}
              FOB = cost to produce one unit at the factory, before shipping and import duties.
              Material prices are China/Asia bulk pricing defaults.
              Get actual supplier quotes before making production decisions.
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: '0.5rem 0 0' }}>
              {OVERHEAD_EXPLANATION}
            </p>
          </div>
        </>
      ) : (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Could not load cost data.
        </p>
      )}

      {/* Export CTA */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button
          onClick={onExportPdf}
          style={{
            padding: '0.625rem 1.5rem',
            background: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Export Tech Pack PDF →
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
          Includes BOM, measurements, size run, and cost breakdown.
        </span>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CostRow({
  label,
  sub,
  value,
  noBorder,
}: {
  label: string;
  sub?: string;
  value: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '0.875rem 1.25rem',
      borderBottom: noBorder ? 'none' : '1px solid var(--color-border)',
      gap: '1rem',
    }}>
      <div>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', margin: 0, fontWeight: 500 }}>{label}</p>
        {sub && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: '0.125rem 0 0' }}>{sub}</p>
        )}
      </div>
      <div style={{ flexShrink: 0, marginTop: '0.125rem' }}>
        {value}
      </div>
    </div>
  );
}

function EditableValue({ value, onEdit, saving, editLabel = 'edit' }: { value: string; onEdit: () => void; saving: boolean; editLabel?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-text)' }}>
        {value}
      </span>
      <button
        onClick={onEdit}
        disabled={saving}
        style={{
          fontSize: '0.6875rem',
          color: 'var(--color-text-secondary)',
          background: 'none',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          padding: '0.125rem 0.375rem',
          cursor: saving ? 'default' : 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {editLabel}
      </button>
    </div>
  );
}

function InlineEdit({
  value,
  onChange,
  onCommit,
  onCancel,
  prefix,
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      {prefix && <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{prefix}</span>}
      <input
        autoFocus
        type="number"
        step="0.01"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel(); }}
        style={{
          width: '72px',
          padding: '0.25rem 0.375rem',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          fontSize: '0.875rem',
          fontFamily: 'var(--font-mono)',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
        }}
      />
      {suffix && <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{suffix}</span>}
      <button onClick={onCommit} style={smallBtnStyle}>✓</button>
      <button onClick={onCancel} style={{ ...smallBtnStyle, color: 'var(--color-text-secondary)' }}>✕</button>
    </div>
  );
}

const smallBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.875rem',
  color: 'var(--color-confirmed)',
  padding: '0.125rem 0.25rem',
  fontFamily: 'inherit',
};

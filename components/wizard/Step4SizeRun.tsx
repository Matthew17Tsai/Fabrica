'use client';

/**
 * Step 4 — Size Run
 *
 * Grading table: measurements × sizes.
 * POST /api/projects/[id]/sizerun to generate from grade rules.
 * PATCH /api/projects/[id]/sizerun for individual cell overrides.
 */

import { useState, useEffect } from 'react';
import type { BaseSize } from '@/lib/db';

interface SizeRunRow {
  id: string;
  measurement_id: string;
  size_label: string;
  value: number;
  is_base_size: boolean;
  is_user_override: boolean;
}

interface MeasurementMeta {
  measurement_id: string;
  label: string;
  group_name: string;
  tolerance: number;
}

interface Props {
  projectId: string;
  baseSize: BaseSize;
  category: string;
  measurements: MeasurementMeta[];
  initialSizeRun?: SizeRunRow[];
  onConfirm: () => void;
}

const ALL_SIZES: BaseSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const CATEGORY_OPTIONS = [
  { value: 'menswear',      label: 'Menswear' },
  { value: 'womenswear',    label: 'Womenswear' },
  { value: 'childrenswear', label: 'Childrenswear' },
];

const SIZE_RANGES = [
  { value: 'XS-XXL',  label: 'XS – XXL (6 sizes)' },
  { value: 'XS-XL',   label: 'XS – XL (5 sizes)' },
  { value: 'S-XXL',   label: 'S – XXL (5 sizes)' },
  { value: 'S-XL',    label: 'S – XL (4 sizes)' },
  { value: 'M-XL',    label: 'M – XL (3 sizes)' },
];

function parseSizeRange(range: string): BaseSize[] {
  const [from, to] = range.split('-') as [BaseSize, BaseSize];
  const fi = ALL_SIZES.indexOf(from);
  const ti = ALL_SIZES.indexOf(to);
  return ALL_SIZES.slice(fi, ti + 1);
}

export default function Step4SizeRun({
  projectId,
  baseSize,
  category: initialCategory,
  measurements,
  initialSizeRun = [],
  onConfirm,
}: Props) {
  const [sizeRun, setSizeRun]       = useState<SizeRunRow[]>(initialSizeRun);
  const [gradeCategory, setGradeCategory] = useState('menswear');
  const [sizeRange, setSizeRange]   = useState('XS-XXL');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const sizes = parseSizeRange(sizeRange);

  // If no size run yet, generate on mount
  useEffect(() => {
    if (initialSizeRun.length === 0 && measurements.length > 0) {
      generateSizeRun();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateSizeRun() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/sizerun`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseSize,
          category: gradeCategory,
          sizeRange: sizes,
        }),
      });
      if (!res.ok) throw new Error('Failed to generate size run');
      const data = await res.json();
      setSizeRun(data.sizeRun);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleCellEdit(rowId: string, measurementId: string, sizeLabel: string, value: number) {
    // Optimistic update
    setSizeRun(prev =>
      prev.map(r =>
        r.id === rowId ? { ...r, value, is_user_override: true } : r,
      ),
    );
    try {
      await fetch(`/api/projects/${projectId}/sizerun`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurement_id: measurementId, size_label: sizeLabel, value }),
      });
    } catch {
      // silently ignore — next generate will overwrite
    }
  }

  // Build lookup: measurementId + sizeLabel → row
  const lookup: Record<string, SizeRunRow> = {};
  for (const row of sizeRun) {
    lookup[`${row.measurement_id}__${row.size_label}`] = row;
  }

  // Group measurements by group_name (just show all in order)
  const meas = measurements.filter(m => sizes.some(s => lookup[`${m.measurement_id}__${s}`]));

  return (
    <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
            Step 3 — Size Run
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            Grade rules auto-fill from base size {baseSize}. Every cell is editable.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
            Category
          </p>
          <select
            value={gradeCategory}
            onChange={e => setGradeCategory(e.target.value)}
            style={selectStyle}
          >
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
            Size Range
          </p>
          <select
            value={sizeRange}
            onChange={e => setSizeRange(e.target.value)}
            style={selectStyle}
          >
            {SIZE_RANGES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button
          onClick={generateSizeRun}
          disabled={generating}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            background: 'var(--color-surface)',
            fontFamily: 'inherit',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            color: 'var(--color-text)',
          }}
        >
          {generating ? 'Generating…' : '↻ Re-grade'}
        </button>
      </div>

      {/* Table */}
      {meas.length === 0 && !generating && (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          No measurements found. Complete Step 3 first.
        </p>
      )}

      {meas.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  Measurement
                </th>
                {sizes.map(size => (
                  <th
                    key={size}
                    style={{
                      padding: '0.5rem 0.625rem',
                      textAlign: 'center',
                      fontWeight: size === baseSize ? 700 : 500,
                      color: size === baseSize ? 'var(--color-text)' : 'var(--color-text-secondary)',
                      minWidth: '64px',
                    }}
                  >
                    {size}
                    {size === baseSize && (
                      <span style={{ display: 'block', fontSize: '0.625rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>
                        base
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meas.map((m, ri) => (
                <tr
                  key={m.measurement_id}
                  style={{ borderBottom: '1px solid var(--color-border)', background: ri % 2 === 0 ? 'transparent' : 'var(--color-bg)' }}
                >
                  <td style={{ padding: '0.375rem 0.75rem', color: 'var(--color-text)' }}>
                    {m.label}
                  </td>
                  {sizes.map(size => {
                    const row = lookup[`${m.measurement_id}__${size}`];
                    const isBase = size === baseSize;
                    return (
                      <td key={size} style={{ padding: '0.25rem 0.375rem', textAlign: 'center' }}>
                        {row ? (
                          <SizeCell
                            value={row.value}
                            isBase={isBase}
                            isOverride={row.is_user_override}
                            onChange={val => handleCellEdit(row.id, m.measurement_id, size, val)}
                          />
                        ) : (
                          <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{error}</p>
      )}

      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={onConfirm}
          disabled={sizeRun.length === 0}
          style={ctaStyle}
        >
          Confirm Size Run →
        </button>
      </div>
    </div>
  );
}

// ── Editable cell ─────────────────────────────────────────────────────────────

function SizeCell({
  value,
  isBase,
  isOverride,
  onChange,
}: {
  value: number;
  isBase: boolean;
  isOverride: boolean;
  onChange: (val: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(String(value.toFixed(2)));

  function commit() {
    const n = parseFloat(draft);
    if (!isNaN(n)) onChange(n);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step="0.25"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        style={{
          width: '60px',
          textAlign: 'right',
          padding: '0.25rem',
          border: '1px solid var(--color-text)',
          borderRadius: '4px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          background: 'var(--color-surface)',
        }}
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(String(value.toFixed(2))); setEditing(true); }}
      title={isOverride ? 'User override' : 'Click to edit'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'text',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8125rem',
        fontWeight: isBase ? 700 : 400,
        color: isOverride ? 'var(--color-unconfirmed)' : isBase ? 'var(--color-text)' : 'var(--color-text-secondary)',
        padding: '0.25rem 0.375rem',
        borderRadius: '4px',
        textDecoration: isOverride ? 'underline dotted' : 'none',
      }}
    >
      {value.toFixed(2)}
    </button>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '0.5rem 0.625rem',
  borderRadius: '6px',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: '0.8125rem',
  fontFamily: 'inherit',
};

const ctaStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.625rem 1.25rem',
  borderRadius: '6px',
  background: 'var(--color-accent)',
  color: '#fff',
  fontWeight: 600,
  fontSize: '0.875rem',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

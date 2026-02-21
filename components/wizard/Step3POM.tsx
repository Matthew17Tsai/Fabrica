'use client';

/**
 * Step 3 — POM (Points of Measure)
 *
 * Left: flat sketch or garment photo.
 * Right: grouped measurement inputs (only groups for confirmed features).
 * Unit toggle (in / cm) converts on the fly.
 * PUT /api/projects/[id]/measurements on "Confirm Measurements".
 */

import { useState, useCallback } from 'react';
import type { BaseSize } from '@/lib/db';

interface MeasurementRow {
  id: string;
  measurement_id: string;
  label: string;
  measurement_point: string | null;
  group_name: string;
  base_value: number | null;
  tolerance: number;
  unit: string;
  notes: string | null;
  sort_order?: number;
}

interface Props {
  projectId: string;
  sketchUrl?: string;
  photoUrl?: string;
  measurements: MeasurementRow[];
  baseSize: BaseSize;
  visibleGroups: string[];
  onConfirm: () => void;
  onMeasurementChange?: () => void;
}

const IN_TO_CM = 2.54;
const CM_TO_IN = 1 / 2.54;

const GROUP_LABELS: Record<string, string> = {
  body:      'Body',
  sleeve:    'Sleeve',
  hood:      'Hood',
  pocket:    'Pocket',
  zipper:    'Zipper',
  drawcord:  'Drawcord',
};

export default function Step3POM({
  projectId,
  sketchUrl,
  photoUrl,
  measurements: initialMeasurements,
  baseSize,
  visibleGroups,
  onConfirm,
  onMeasurementChange,
}: Props) {
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const [values, setValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const m of initialMeasurements) {
      map[m.measurement_id] = m.base_value != null ? String(m.base_value) : '';
    }
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sketchCacheBuster, setSketchCacheBuster] = useState(0);
  const [uploading, setUploading] = useState<'front' | 'back' | null>(null);

  const convert = useCallback((val: string, fromUnit: 'in' | 'cm', toUnit: 'in' | 'cm'): string => {
    if (!val || isNaN(Number(val))) return val;
    const n = Number(val);
    if (fromUnit === toUnit) return val;
    const converted = fromUnit === 'in' ? n * IN_TO_CM : n * CM_TO_IN;
    return converted.toFixed(2);
  }, []);

  function toggleUnit() {
    const to = unit === 'in' ? 'cm' : 'in';
    // Convert all values
    const converted: Record<string, string> = {};
    for (const [k, v] of Object.entries(values)) {
      converted[k] = convert(v, unit, to);
    }
    setValues(converted);
    setUnit(to);
  }

  function handleChange(measurementId: string, val: string) {
    setValues(prev => ({ ...prev, [measurementId]: val }));
  }

  // Group measurements by group_name
  const grouped = visibleGroups.reduce<Record<string, MeasurementRow[]>>((acc, group) => {
    acc[group] = initialMeasurements.filter(m => m.group_name === group);
    return acc;
  }, {});

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      // Convert back to inches for storage
      const updates = Object.entries(values).map(([measurement_id, val]) => ({
        measurement_id,
        base_value: val
          ? Number(unit === 'cm' ? convert(val, 'cm', 'in') : val)
          : null,
      })).filter(u => u.base_value !== null);

      const res = await fetch(`/api/projects/${projectId}/measurements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) throw new Error('Failed to save measurements');
      onMeasurementChange?.();
      onConfirm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSketchUpload(view: 'front' | 'back', file: File) {
    setUploading(view);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await fetch(`/api/projects/${projectId}/upload-sketch?view=${view}`, {
        method: 'POST',
        body: fd,
      });
      setSketchCacheBuster(n => n + 1);
    } finally {
      setUploading(null);
    }
  }

  // Use cache-busted sketch URL after upload
  const frontSketchUrl = sketchUrl ? `${sketchUrl}${sketchCacheBuster ? `&t=${sketchCacheBuster}` : ''}` : undefined;
  const imageUrl = frontSketchUrl ?? photoUrl;

  return (
    <div style={{ display: 'flex', gap: '2rem', padding: '2rem', flex: 1 }}>
      {/* Left: sketch / photo + upload buttons */}
      <div style={{ flexShrink: 0, width: '220px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Flat sketch"
            style={{
              width: '100%',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              objectFit: 'contain',
              background: '#fff',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            aspectRatio: '3 / 4',
            border: '1px dashed var(--color-border)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-tertiary)',
            fontSize: '0.8125rem',
          }}>
            No sketch
          </div>
        )}

        {/* Upload own sketch */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
            Upload your own sketch to replace the AI draft:
          </p>
          {(['front', 'back'] as const).map(view => (
            <label key={view} style={{ display: 'block' }}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleSketchUpload(view, file);
                  e.target.value = '';
                }}
              />
              <span style={{
                display: 'inline-block',
                padding: '0.3rem 0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: '5px',
                fontSize: '0.75rem',
                cursor: uploading === view ? 'default' : 'pointer',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-surface)',
                width: '100%',
                textAlign: 'center',
                boxSizing: 'border-box',
              }}>
                {uploading === view ? 'Uploading…' : `Upload ${view} sketch`}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Right: inputs */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Step 2 — POM
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Enter base size ({baseSize}) measurements. Size run grades automatically in Step 3.
            </p>
          </div>
          {/* Unit toggle */}
          <button
            onClick={toggleUnit}
            style={{
              padding: '0.375rem 0.875rem',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              background: 'var(--color-surface)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              color: 'var(--color-text)',
            }}
          >
            {unit === 'in' ? 'in → cm' : 'cm → in'}
          </button>
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.75rem 1fr 160px 72px auto',
          gap: '0.5rem',
          paddingBottom: '0.375rem',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '0.25rem',
        }}>
          <span />
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Point of Measure</span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>How to Measure</span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Value</span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tol</span>
        </div>

        {/* Grouped measurements */}
        {visibleGroups.map(group => {
          const rows = grouped[group] ?? [];
          if (rows.length === 0) return null;
          return (
            <div key={group}>
              <h3 style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.5rem',
                paddingBottom: '0.25rem',
                borderBottom: '1px solid var(--color-border)',
              }}>
                {GROUP_LABELS[group] ?? group}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {rows.map((m, idx) => {
                  // Compute global letter code (A, B, C...) across all groups
                  const globalIdx = initialMeasurements.findIndex(x => x.measurement_id === m.measurement_id);
                  const pomCode = String.fromCharCode(65 + (globalIdx >= 0 ? globalIdx : idx));
                  return (
                    <MeasurementInput
                      key={m.measurement_id}
                      pomCode={pomCode}
                      label={m.label}
                      measurementPoint={m.measurement_point}
                      unit={unit}
                      tolerance={m.tolerance}
                      value={values[m.measurement_id] ?? ''}
                      onChange={val => handleChange(m.measurement_id, val)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {error && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-error)' }}>{error}</p>
        )}

        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleConfirm} disabled={saving} style={ctaStyle}>
            {saving ? 'Saving…' : 'Confirm Measurements →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Measurement input row ─────────────────────────────────────────────────────

function MeasurementInput({
  pomCode,
  label,
  measurementPoint,
  unit,
  tolerance,
  value,
  onChange,
}: {
  pomCode: string;
  label: string;
  measurementPoint: string | null;
  unit: 'in' | 'cm';
  tolerance: number;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.75rem 1fr 160px 72px auto',
      gap: '0.5rem',
      alignItems: 'center',
      padding: '0.375rem 0',
    }}>
      {/* Letter code badge */}
      <span style={{
        fontSize: '0.6875rem',
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-text-secondary)',
        background: 'var(--color-border)',
        borderRadius: '3px',
        padding: '0.125rem 0.25rem',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        {pomCode}
      </span>
      {/* Label */}
      <span style={{ fontSize: '0.8125rem', color: 'var(--color-text)' }}>{label}</span>
      {/* How to Measure */}
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
        {measurementPoint ?? '—'}
      </span>
      <input
        type="number"
        step="0.25"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        style={{
          width: '72px',
          textAlign: 'right',
          padding: '0.375rem 0.5rem',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
        }}
      />
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', width: '48px', whiteSpace: 'nowrap' }}>
        {unit} <span style={{ color: 'var(--color-text-tertiary)' }}>±{tolerance}</span>
      </span>
    </div>
  );
}

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

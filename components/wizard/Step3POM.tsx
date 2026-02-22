'use client';

/**
 * Step 3 — POM (Points of Measure)
 *
 * Left: flat sketch or garment photo.
 * Right: grouped measurement inputs (only groups for confirmed features).
 * Unit toggle (in / cm) converts on the fly.
 * PUT /api/projects/[id]/measurements on "Confirm Measurements".
 */

import { useState, useCallback, useEffect } from 'react';
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
  garmentCategory?: string;
  onConfirm: () => void;
  onMeasurementChange?: () => void;
  /** Called after a successful sketch regeneration, upload, or version activation.
   *  Parent can use this to refresh other components (e.g. sidebar thumbnails). */
  onSketchChange?: () => void;
}

// ── POM callout positions ─────────────────────────────────────────────────────
// Coordinates are 0-100 relative to the sketch image (width × height).
// Each entry: x1,y1 = line start (where label appears), x2,y2 = line end (arrowhead).

interface CalloutLine { x1: number; y1: number; x2: number; y2: number; }

const POM_CALLOUTS: Record<string, CalloutLine> = {
  // Body
  body_length:      { x1: 8,  y1: 14, x2: 8,  y2: 90 },
  front_length:     { x1: 92, y1: 14, x2: 92, y2: 90 },
  chest_width:      { x1: 12, y1: 38, x2: 88, y2: 38 },
  shoulder_across:  { x1: 20, y1: 13, x2: 80, y2: 13 },
  hem_width:        { x1: 14, y1: 91, x2: 86, y2: 91 },
  // Sleeve
  sleeve_length:    { x1: 5,  y1: 14, x2: 5,  y2: 68 },  // approximated on left
  upper_arm:        { x1: 5,  y1: 33, x2: 18, y2: 33 },
  cuff_width:       { x1: 5,  y1: 70, x2: 18, y2: 70 },
  cuff_height:      { x1: 3,  y1: 65, x2: 3,  y2: 73 },
  // Hood
  hood_height:      { x1: 50, y1: 2,  x2: 50, y2: 14 },
  hood_width:       { x1: 32, y1: 7,  x2: 68, y2: 7 },
  // Pocket
  kangaroo_width:   { x1: 25, y1: 63, x2: 75, y2: 63 },
  pocket_height:    { x1: 73, y1: 55, x2: 73, y2: 72 },
  pocket_width:     { x1: 25, y1: 63, x2: 75, y2: 63 },
  // Zipper / closure
  zipper_length:    { x1: 50, y1: 14, x2: 50, y2: 89 },
  // Sweatpants
  waist_width:      { x1: 15, y1: 8,  x2: 85, y2: 8  },
  hip_width:        { x1: 12, y1: 20, x2: 88, y2: 20 },
  thigh_width:      { x1: 15, y1: 38, x2: 55, y2: 38 },
  knee_width:       { x1: 15, y1: 62, x2: 55, y2: 62 },
  leg_opening:      { x1: 15, y1: 90, x2: 45, y2: 90 },
  inseam:           { x1: 50, y1: 20, x2: 50, y2: 90 },
  outseam:          { x1: 8,  y1: 8,  x2: 8,  y2: 90 },
  waistband_height: { x1: 92, y1: 8,  x2: 92, y2: 16 },
};

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
  garmentCategory,
  onConfirm,
  onMeasurementChange,
  onSketchChange,
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
  // Cache buster: changing this forces a fresh fetch of the ai-sketch endpoint.
  const [cacheBuster, setCacheBuster] = useState(() => String(Date.now()));
  // Whether any sketch (AI or user-uploaded) is known to exist for this project.
  const [hasSketch, setHasSketch] = useState(!!sketchUrl);
  const [uploading, setUploading] = useState<'front' | 'back' | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  // Version history — each entry is a front+back pair keyed by timestamp
  interface SketchVersion {
    timestamp: string;
    date:      string;
    frontUrl:  string;
    backUrl:   string | null;
  }
  const [versions, setVersions] = useState<SketchVersion[]>([]);
  const [activating, setActivating] = useState<string | null>(null); // timestamp being activated

  async function loadVersions() {
    try {
      const res = await fetch(`/api/projects/${projectId}/sketch-history`);
      if (res.ok) {
        const d = await res.json();
        setVersions(d.versions ?? []);
      }
    } catch { /* ignore */ }
  }

  useEffect(() => { loadVersions(); }, [projectId]);

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

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-sketch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (data.skipped) {
        setRegenError(data.reason ?? 'Sketch generation skipped');
      } else {
        setHasSketch(true);
        setCacheBuster(String(Date.now()));
        // Reload version history (old pair was archived before overwrite)
        loadVersions();
        // Tell parent to refresh sidebar thumbnails (both front + back updated)
        onSketchChange?.();
      }
    } catch {
      setRegenError('Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleActivateVersion(timestamp: string) {
    setActivating(timestamp);
    try {
      const res = await fetch(`/api/projects/${projectId}/sketch-activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp }),
      });
      if (!res.ok) throw new Error('Activation failed');
      // Force the main sketch image to reload from the now-updated active files.
      setHasSketch(true);
      setCacheBuster(String(Date.now()));
      // Tell parent to refresh sidebar thumbnails (front + back both updated)
      onSketchChange?.();
      // Reload version history so the newly archived pair appears immediately
      loadVersions();
    } catch {
      // silently ignore — user can retry
    } finally {
      setActivating(null);
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
      setHasSketch(true);
      setCacheBuster(String(Date.now()));
      onSketchChange?.();
    } finally {
      setUploading(null);
    }
  }

  // Always use the ai-sketch endpoint (which serves user-uploaded first, then AI).
  // Including a cache buster ensures the browser fetches fresh after any change.
  const imageUrl = hasSketch
    ? `/api/projects/${projectId}/ai-sketch?view=front&t=${cacheBuster}`
    : photoUrl;

  return (
    <div style={{ display: 'flex', gap: '2rem', padding: '2rem', flex: 1 }}>
      {/* Left: sketch / photo + upload buttons */}
      <div style={{ flexShrink: 0, width: '220px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {imageUrl ? (
          <>
          <div
            onClick={() => setZoomed(true)}
            style={{ position: 'relative', width: '100%', border: '1px solid var(--color-border)', borderRadius: '8px', background: '#fff', overflow: 'hidden', cursor: 'zoom-in' }}
          >
            <img
              key={cacheBuster}
              src={imageUrl}
              alt="Flat sketch"
              style={{ width: '100%', display: 'block', objectFit: 'contain' }}
            />
            {/* POM callout overlay */}
            <PomCalloutSvg measurements={initialMeasurements} />
            {/* Zoom hint */}
            <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.45)', borderRadius: '4px', padding: '2px 5px', fontSize: '0.625rem', color: '#fff', pointerEvents: 'none' }}>
              Click to zoom
            </div>
          </div>

          {/* Zoom lightbox */}
          {zoomed && (
            <div
              onClick={() => setZoomed(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{ position: 'relative', maxWidth: '72vw', maxHeight: '90vh', cursor: 'default' }}
              >
                <img
                  src={imageUrl}
                  alt="Flat sketch (zoomed)"
                  style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', display: 'block' }}
                />
                <PomCalloutSvg measurements={initialMeasurements} scale={1.5} />
                <button
                  onClick={() => setZoomed(false)}
                  style={{
                    position: 'absolute', top: -14, right: -14,
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.9)', border: 'none',
                    cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              </div>
            </div>
          )}
          </>
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

        {/* Regenerate AI flat sketch */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            style={{
              padding: '0.3rem 0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: '5px',
              fontSize: '0.75rem',
              cursor: regenerating ? 'default' : 'pointer',
              color: 'var(--color-text-secondary)',
              background: 'var(--color-surface)',
              width: '100%',
              textAlign: 'center',
            }}
          >
            {regenerating ? 'Generating…' : 'Regenerate Flat Sketch'}
          </button>
          {regenError && (
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-error)', margin: 0 }}>
              {regenError}
            </p>
          )}
        </div>

        {/* Version history — shows front+back pairs */}
        {versions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Previous versions
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {versions.map(v => (
                <div key={v.timestamp} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {/* Front + back thumbnails side by side */}
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '4px', background: '#fff', overflow: 'hidden' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.frontUrl} alt="front" style={{ width: '100%', display: 'block', objectFit: 'contain' }} />
                    </div>
                    {v.backUrl ? (
                      <div style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '4px', background: '#fff', overflow: 'hidden' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.backUrl} alt="back" style={{ width: '100%', display: 'block', objectFit: 'contain' }} />
                      </div>
                    ) : (
                      <div style={{ flex: 1, border: '1px dashed var(--color-border)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5625rem', color: 'var(--color-text-tertiary)' }}>
                        no back
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.5625rem', color: 'var(--color-text-tertiary)', lineHeight: 1.3, flex: 1 }}>
                      {v.date}
                    </span>
                    <button
                      onClick={() => handleActivateVersion(v.timestamp)}
                      disabled={activating === v.timestamp}
                      style={{
                        padding: '0.125rem 0.5rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        fontSize: '0.625rem',
                        cursor: activating === v.timestamp ? 'default' : 'pointer',
                        color: 'var(--color-text-secondary)',
                        background: 'var(--color-surface)',
                        flexShrink: 0,
                      }}
                    >
                      {activating === v.timestamp ? '…' : 'Use this pair'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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

// ── POM callout SVG overlay ───────────────────────────────────────────────────

function PomCalloutSvg({ measurements, scale = 1 }: { measurements: MeasurementRow[]; scale?: number }) {
  void scale; // scale param reserved for future per-size tweaking; SVG uses viewBox proportional coords
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      {measurements.map((m, idx) => {
        const callout = POM_CALLOUTS[m.measurement_id];
        if (!callout) return null;
        const code = String.fromCharCode(65 + idx);
        const isHoriz = Math.abs(callout.y2 - callout.y1) < 3;
        const labelX = callout.x1 < 50 ? callout.x1 - 1 : callout.x1 + 1;
        return (
          <g key={m.measurement_id}>
            <line
              x1={callout.x1} y1={callout.y1} x2={callout.x2} y2={callout.y2}
              stroke="#ef4444" strokeWidth="0.6"
              strokeDasharray={isHoriz ? '1.5 0.8' : 'none'}
            />
            {isHoriz ? (
              <>
                <line x1={callout.x1} y1={callout.y1 - 1.2} x2={callout.x1} y2={callout.y1 + 1.2} stroke="#ef4444" strokeWidth="0.6" />
                <line x1={callout.x2} y1={callout.y2 - 1.2} x2={callout.x2} y2={callout.y2 + 1.2} stroke="#ef4444" strokeWidth="0.6" />
              </>
            ) : (
              <>
                <line x1={callout.x1 - 1.2} y1={callout.y1} x2={callout.x1 + 1.2} y2={callout.y1} stroke="#ef4444" strokeWidth="0.6" />
                <line x1={callout.x2 - 1.2} y1={callout.y2} x2={callout.x2 + 1.2} y2={callout.y2} stroke="#ef4444" strokeWidth="0.6" />
              </>
            )}
            <rect
              x={callout.x1 < 50 ? labelX - 2.8 : labelX}
              y={callout.y1 - 2} width={4} height={4} rx={0.6} fill="#ef4444"
            />
            <text
              x={callout.x1 < 50 ? labelX - 0.8 : labelX + 2.0}
              y={callout.y1 + 1.2}
              fontSize="2.4" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="monospace"
            >{code}</text>
          </g>
        );
      })}
    </svg>
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

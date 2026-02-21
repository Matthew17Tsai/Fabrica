'use client';

import { useState, useEffect, useCallback } from 'react';

interface MeasurementRow {
  id: string;
  measurement_id: string;
  label: string;
  value_inches: number | null;
  tolerance: number;
  notes: string | null;
  sort_order: number;
}

interface Props {
  projectId: string;
  category: string;
  hasFlatFront: boolean;
  baseSize: string | null;
  fit: string | null;
}

function round4(n: number) { return Math.round(n * 10000) / 10000; }
function inToCm(n: number) { return Math.round(n * 2.54 * 10) / 10; }
function cmToIn(n: number) { return Math.round((n / 2.54) * 8) / 8; }

// ── SVG helper ────────────────────────────────────────────────────────────────

function constrainSvg(svg: string): string {
  return svg.replace(
    /(<svg\b)([^>]*)(>)/i,
    (_, open, attrs, close) => {
      const cleaned = attrs
        .replace(/\s+width="[^"]*"/gi, '')
        .replace(/\s+height="[^"]*"/gi, '');
      return `${open}${cleaned} width="100%" style="display:block;height:auto"${close}`;
    },
  );
}

// ── POM callout positions with leader lines ───────────────────────────────────
// All coords are 0-1 relative to the FULL panel (including margins).
// The garment image is padded to occupy roughly the center 60% of the panel width
// (so garment spans ~20%-80% horizontally) and ~5%-95% vertically.
// pointX/Y = small dot placed ON the garment at the measurement location.
// labelX/Y = numbered circle placed in the margin (left ~0-18%, right ~82-100%).

type CalloutEntry = {
  pointX: number; pointY: number;   // measurement dot on garment
  labelX: number; labelY: number;   // numbered circle in margin
};
type CalloutMap = Record<string, CalloutEntry>;

const HOODIE_CALLOUTS: CalloutMap = {
  // LEFT MARGIN — evenly spaced
  body_length:      { pointX: 0.26, pointY: 0.50, labelX: 0.06, labelY: 0.15 },
  chest_width:      { pointX: 0.36, pointY: 0.38, labelX: 0.06, labelY: 0.28 },
  hem_width:        { pointX: 0.36, pointY: 0.89, labelX: 0.06, labelY: 0.41 },
  front_length:     { pointX: 0.44, pointY: 0.52, labelX: 0.06, labelY: 0.54 },
  pocket_width:     { pointX: 0.44, pointY: 0.69, labelX: 0.06, labelY: 0.67 },
  pocket_height:    { pointX: 0.38, pointY: 0.73, labelX: 0.06, labelY: 0.80 },
  hem_rib_height:   { pointX: 0.30, pointY: 0.93, labelX: 0.06, labelY: 0.93 },

  // RIGHT MARGIN — evenly spaced
  shoulder_across:  { pointX: 0.60, pointY: 0.22, labelX: 0.94, labelY: 0.15 },
  sleeve_length:    { pointX: 0.79, pointY: 0.36, labelX: 0.94, labelY: 0.28 },
  upper_arm:        { pointX: 0.76, pointY: 0.38, labelX: 0.94, labelY: 0.41 },
  armhole_straight: { pointX: 0.66, pointY: 0.30, labelX: 0.94, labelY: 0.54 },
  armhole_curved:   { pointX: 0.68, pointY: 0.33, labelX: 0.94, labelY: 0.67 },
  cuff_width:       { pointX: 0.80, pointY: 0.61, labelX: 0.94, labelY: 0.80 },
  cuff_height:      { pointX: 0.81, pointY: 0.64, labelX: 0.94, labelY: 0.93 },

  // TOP — hood area spread across
  hood_height:      { pointX: 0.50, pointY: 0.06, labelX: 0.30, labelY: 0.02 },
  neck_opening:     { pointX: 0.50, pointY: 0.20, labelX: 0.50, labelY: 0.02 },
  hood_width:       { pointX: 0.50, pointY: 0.12, labelX: 0.70, labelY: 0.02 },

  // BOTTOM — zipper length (if applicable)
  zipper_length:    { pointX: 0.50, pointY: 0.55, labelX: 0.50, labelY: 0.98 },
};

const SWEATSHIRT_CALLOUTS: CalloutMap = {
  // LEFT MARGIN
  body_length:      { pointX: 0.26, pointY: 0.50, labelX: 0.06, labelY: 0.15 },
  chest_width:      { pointX: 0.36, pointY: 0.38, labelX: 0.06, labelY: 0.28 },
  hem_width:        { pointX: 0.36, pointY: 0.89, labelX: 0.06, labelY: 0.41 },
  front_length:     { pointX: 0.44, pointY: 0.52, labelX: 0.06, labelY: 0.54 },
  hem_rib_height:   { pointX: 0.30, pointY: 0.93, labelX: 0.06, labelY: 0.67 },

  // RIGHT MARGIN
  shoulder_across:  { pointX: 0.60, pointY: 0.22, labelX: 0.94, labelY: 0.15 },
  sleeve_length:    { pointX: 0.79, pointY: 0.36, labelX: 0.94, labelY: 0.28 },
  upper_arm:        { pointX: 0.76, pointY: 0.38, labelX: 0.94, labelY: 0.41 },
  armhole_straight: { pointX: 0.66, pointY: 0.30, labelX: 0.94, labelY: 0.54 },
  armhole_curved:   { pointX: 0.68, pointY: 0.33, labelX: 0.94, labelY: 0.67 },
  cuff_width:       { pointX: 0.80, pointY: 0.61, labelX: 0.94, labelY: 0.80 },
  cuff_height:      { pointX: 0.81, pointY: 0.64, labelX: 0.94, labelY: 0.93 },

  // TOP
  neck_opening:     { pointX: 0.50, pointY: 0.16, labelX: 0.38, labelY: 0.02 },
  neckband_width:   { pointX: 0.50, pointY: 0.11, labelX: 0.50, labelY: 0.02 },
  neckband_height:  { pointX: 0.58, pointY: 0.12, labelX: 0.62, labelY: 0.02 },
};

const SWEATPANTS_CALLOUTS: CalloutMap = {
  // LEFT MARGIN
  outseam:           { pointX: 0.26, pointY: 0.55, labelX: 0.06, labelY: 0.20 },
  front_rise:        { pointX: 0.28, pointY: 0.28, labelX: 0.06, labelY: 0.35 },
  inseam:            { pointX: 0.48, pointY: 0.65, labelX: 0.06, labelY: 0.50 },
  knee_width:        { pointX: 0.50, pointY: 0.60, labelX: 0.06, labelY: 0.65 },
  side_pocket_depth: { pointX: 0.24, pointY: 0.26, labelX: 0.06, labelY: 0.80 },

  // RIGHT MARGIN
  hip_width:         { pointX: 0.60, pointY: 0.20, labelX: 0.94, labelY: 0.20 },
  back_rise:         { pointX: 0.72, pointY: 0.28, labelX: 0.94, labelY: 0.35 },
  thigh_width:       { pointX: 0.60, pointY: 0.35, labelX: 0.94, labelY: 0.50 },
  leg_opening:       { pointX: 0.50, pointY: 0.93, labelX: 0.94, labelY: 0.65 },
  back_pocket_width: { pointX: 0.74, pointY: 0.36, labelX: 0.94, labelY: 0.80 },

  // TOP — waistband
  waist_relaxed:     { pointX: 0.36, pointY: 0.07, labelX: 0.30, labelY: 0.02 },
  waistband_height:  { pointX: 0.50, pointY: 0.05, labelX: 0.50, labelY: 0.02 },
  waist_stretched:   { pointX: 0.64, pointY: 0.07, labelX: 0.70, labelY: 0.02 },

  // BOTTOM
  drawcord_length:   { pointX: 0.50, pointY: 0.06, labelX: 0.50, labelY: 0.98 },
};

const CALLOUT_POSITIONS: Record<string, CalloutMap> = {
  hoodie:     HOODIE_CALLOUTS,
  sweatshirt: SWEATSHIRT_CALLOUTS,
  sweatpants: SWEATPANTS_CALLOUTS,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MeasurementsTab({ projectId, category, hasFlatFront, baseSize, fit }: Props) {
  const [rows,       setRows]       = useState<MeasurementRow[]>([]);
  const [edits,      setEdits]      = useState<Record<string, string>>({});
  const [unit,       setUnit]       = useState<'in' | 'cm'>('in');
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [svgFront,   setSvgFront]   = useState<string | null>(null);
  const [msg,        setMsg]        = useState('');
  const [error,      setError]      = useState('');

  const calloutMap = CALLOUT_POSITIONS[category] ?? {};

  // Load measurements
  const loadMeasurements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/projects/${projectId}/measurements`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      const fetched: MeasurementRow[] = data.measurements ?? [];
      setRows(fetched);
      const initial: Record<string, string> = {};
      fetched.forEach((r) => {
        const v = r.value_inches;
        initial[r.measurement_id] = v != null
          ? (unit === 'cm' ? inToCm(v).toString() : v.toString())
          : '';
      });
      setEdits(initial);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load measurements');
    } finally {
      setLoading(false);
    }
  }, [projectId, unit]);

  // Load front sketch for the left panel
  const loadSketch = useCallback(async () => {
    if (!hasFlatFront) return;
    try {
      const res  = await fetch(`/api/projects/${projectId}/flat-sketch?view=front`);
      const data = await res.json();
      setSvgFront(data.front?.svg ?? null);
    } catch {}
  }, [projectId, hasFlatFront]);

  useEffect(() => { loadMeasurements(); }, [loadMeasurements]);
  useEffect(() => { loadSketch(); },       [loadSketch]);

  // Re-sync edit state when unit changes
  useEffect(() => {
    const next: Record<string, string> = {};
    rows.forEach((r) => {
      const v = r.value_inches;
      next[r.measurement_id] = v != null
        ? (unit === 'cm' ? inToCm(v).toString() : v.toString())
        : '';
    });
    setEdits(next);
  }, [unit, rows]);

  const handleChange = (measurement_id: string, raw: string) => {
    setEdits((prev) => ({ ...prev, [measurement_id]: raw }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    setError('');
    const updates = rows.map((r) => {
      const raw = edits[r.measurement_id] ?? '';
      const parsed = parseFloat(raw);
      const value_inches = isNaN(parsed)
        ? null
        : unit === 'cm' ? cmToIn(parsed) : parsed;
      return { measurement_id: r.measurement_id, value_inches };
    });
    try {
      const res  = await fetch(`/api/projects/${projectId}/measurements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setRows(data.measurements);
      setMsg('Measurements saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePrefill = async () => {
    setPrefilling(true);
    setMsg('');
    setError('');
    try {
      const res  = await fetch(`/api/projects/${projectId}/measurements/prefill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size: baseSize ?? 'M', fit: fit ?? 'regular' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Prefill failed');
      setMsg(`Pre-filled ${data.prefilled} measurements for size ${data.size} / ${data.fit}.`);
      await loadMeasurements();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prefill failed');
    } finally {
      setPrefilling(false);
    }
  };

  const displayValue = (r: MeasurementRow) => {
    const v = r.value_inches;
    if (v == null) return '';
    return unit === 'cm' ? inToCm(v).toString() : v.toString();
  };

  const toleranceDisplay = (tol: number) =>
    unit === 'cm' ? `±${round4(tol * 2.54)} cm` : `±${tol}"`;

  return (
    <div className="flex gap-6 h-full">
      {/* Left: flat sketch panel with callout overlay */}
      <div className="hidden md:flex flex-col w-72 flex-shrink-0">
        <div className="sticky top-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ position: 'relative' }}>
            {svgFront ? (
              <>
                {/* Garment SVG — padded 20% on each side so margins are free for leader line labels */}
                <div
                  style={{ padding: '4% 20% 4% 20%', maxHeight: 480, overflow: 'hidden' }}
                  dangerouslySetInnerHTML={{ __html: constrainSvg(svgFront) }}
                />

                {/* Callout overlay: dot → leader line → numbered circle in margin */}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="xMidYMid meet"
                  style={{
                    position:      'absolute',
                    inset:         0,
                    width:         '100%',
                    height:        '100%',
                    pointerEvents: 'none',
                  }}
                >
                  {rows.map((r, idx) => {
                    const pos = calloutMap[r.measurement_id];
                    if (!pos) return null;
                    const px = pos.pointX * 100;
                    const py = pos.pointY * 100;
                    const lx = pos.labelX * 100;
                    const ly = pos.labelY * 100;
                    const num = idx + 1;
                    return (
                      <g key={r.measurement_id}>
                        {/* Leader line */}
                        <line
                          x1={px} y1={py} x2={lx} y2={ly}
                          stroke="#4A7CCC" strokeWidth="0.5" opacity="0.55"
                        />
                        {/* Dot on garment */}
                        <circle cx={px} cy={py} r="1.6" fill="#4A7CCC" />
                        {/* Label circle in margin */}
                        <circle cx={lx} cy={ly} r="5.2" fill="white" stroke="#4A7CCC" strokeWidth="1" />
                        <text
                          x={lx}
                          y={ly + 1.8}
                          textAnchor="middle"
                          fontSize={num >= 10 ? "4" : "4.5"}
                          fontWeight="600"
                          fontFamily="sans-serif"
                          fill="#4A7CCC"
                        >
                          {num}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </>
            ) : (
              <div className="flex items-center justify-center p-4" style={{ minHeight: 280 }}>
                <p className="text-xs text-gray-400 text-center">
                  Generate flat sketch first to see it here.
                </p>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400 text-center">
            Numbered callouts correspond to table rows below
          </p>
        </div>
      </div>

      {/* Right: measurement table */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            {(['in', 'cm'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  unit === u ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {u === 'in' ? 'Inches' : 'Centimeters'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrefill}
              disabled={prefilling || saving}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              {prefilling ? 'Loading…' : 'Pre-fill from template'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || prefilling || loading}
              className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>

        {msg && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            {msg}
          </p>
        )}
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-sm text-gray-400 py-8 text-center">Loading measurements…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 space-y-3 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-sm">No measurements yet.</p>
            <button
              onClick={handlePrefill}
              disabled={prefilling}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {prefilling ? 'Loading…' : 'Load template measurements'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-center px-2 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Point of Measure</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">
                    Value ({unit})
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28 hidden sm:table-cell">
                    Tolerance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, idx) => (
                  <tr key={r.measurement_id} className="hover:bg-gray-50 transition group">
                    <td className="px-2 py-2.5 text-center">
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-blue-50 text-primary">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-800">{r.label}</div>
                      {r.notes && (
                        <div className="text-xs text-gray-400 mt-0.5">{r.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        step="0.125"
                        min="0"
                        value={edits[r.measurement_id] ?? displayValue(r)}
                        onChange={(e) => handleChange(r.measurement_id, e.target.value)}
                        placeholder="—"
                        className="w-24 text-right px-2 py-1 border border-transparent rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition bg-transparent group-hover:bg-white group-hover:border-gray-200 font-mono text-gray-800"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-400 text-xs hidden sm:table-cell">
                      {toleranceDisplay(r.tolerance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
              {rows.length} points of measure · {unit === 'in' ? 'Inches' : 'Centimeters'} · Numbers match callout labels on the sketch
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

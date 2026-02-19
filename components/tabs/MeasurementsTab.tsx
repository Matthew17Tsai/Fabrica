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
  hasFlatFront: boolean;
  baseSize: string | null;
  fit: string | null;
}

function round4(n: number) { return Math.round(n * 10000) / 10000; }
function inToCm(n: number) { return Math.round(n * 2.54 * 10) / 10; }
function cmToIn(n: number) { return Math.round((n / 2.54) * 8) / 8; }

export default function MeasurementsTab({ projectId, hasFlatFront, baseSize, fit }: Props) {
  const [rows,       setRows]       = useState<MeasurementRow[]>([]);
  const [edits,      setEdits]      = useState<Record<string, string>>({}); // measurement_id → raw input string
  const [unit,       setUnit]       = useState<'in' | 'cm'>('in');
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [prefilling, setPrefilling] = useState(false);
  const [svgFront,   setSvgFront]   = useState<string | null>(null);
  const [sketchView, setSketchView] = useState<'front' | 'back'>('front');
  const [msg,        setMsg]        = useState('');
  const [error,      setError]      = useState('');

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
      // Initialise edit state with current display values
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
    unit === 'cm' ? `±${round4(tol * 2.54)}" cm` : `±${tol}"`;

  return (
    <div className="flex gap-6 h-full">
      {/* Left: flat sketch panel */}
      <div className="hidden md:flex flex-col w-72 flex-shrink-0">
        <div className="sticky top-4">
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1 mb-3">
            {(['front', 'back'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setSketchView(v)}
                className={`flex-1 py-1 rounded-md text-xs font-medium transition ${
                  sketchView === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 min-h-[400px] flex items-center justify-center p-3">
            {svgFront ? (
              <div
                className="w-full"
                dangerouslySetInnerHTML={{ __html: svgFront }}
              />
            ) : (
              <p className="text-xs text-gray-400 text-center">
                Generate flat sketch first to see it here.
              </p>
            )}
          </div>
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
                {rows.map((r) => (
                  <tr key={r.measurement_id} className="hover:bg-gray-50 transition group">
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
              {rows.length} points of measure · {unit === 'in' ? 'Inches' : 'Centimeters'} · Tolerance is factory-standard ±
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

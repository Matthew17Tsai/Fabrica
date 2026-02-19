'use client';

import { useState, useEffect, useCallback } from 'react';

interface BomItem {
  id: string;
  component: string;
  material: string;
  composition: string;
  weight: string;
  supplier: string | null;
  color: string | null;
  notes: string | null;
  sort_order: number;
}

// Local editable row (no id until saved; use a clientKey for React keys)
interface EditRow {
  clientKey: string;
  component: string;
  material: string;
  composition: string;
  weight: string;
  supplier: string;
  color: string;
  notes: string;
}

let _keyCounter = 0;
function nextKey() { return `row_${++_keyCounter}`; }

function itemToEdit(item: BomItem): EditRow {
  return {
    clientKey:   item.id,
    component:   item.component,
    material:    item.material,
    composition: item.composition,
    weight:      item.weight,
    supplier:    item.supplier  ?? '',
    color:       item.color     ?? '',
    notes:       item.notes     ?? '',
  };
}

function emptyRow(): EditRow {
  return { clientKey: nextKey(), component: '', material: '', composition: '', weight: '', supplier: '', color: '', notes: '' };
}

const COLS = ['Component', 'Material', 'Composition', 'Weight', 'Supplier', 'Color', 'Notes'] as const;
type ColKey = 'component' | 'material' | 'composition' | 'weight' | 'supplier' | 'color' | 'notes';
const COL_KEYS: ColKey[] = ['component', 'material', 'composition', 'weight', 'supplier', 'color', 'notes'];

interface Props {
  projectId: string;
}

export default function BomTab({ projectId }: Props) {
  const [rows,    setRows]    = useState<EditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState('');
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/projects/${projectId}/bom`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load BOM');
      setRows((data.bom as BomItem[]).map(itemToEdit));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load BOM');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const setCell = (key: string, col: ColKey, value: string) => {
    setRows((prev) => prev.map((r) => r.clientKey === key ? { ...r, [col]: value } : r));
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow()]);
  };

  const deleteRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.clientKey !== key));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    setError('');
    const items = rows.map((r, i) => ({
      component:   r.component,
      material:    r.material,
      composition: r.composition,
      weight:      r.weight,
      supplier:    r.supplier  || null,
      color:       r.color     || null,
      notes:       r.notes     || null,
      sort_order:  i,
    }));
    try {
      const res  = await fetch(`/api/projects/${projectId}/bom`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setRows((data.bom as BomItem[]).map(itemToEdit));
      setMsg('BOM saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset BOM to template? This will overwrite your current data.')) return;
    // Force re-seed by deleting all and re-GETting (GET auto-seeds if empty)
    setSaving(true);
    setMsg('');
    setError('');
    try {
      // Send empty items to clear, then reload (GET will auto-seed)
      const clearRes = await fetch(`/api/projects/${projectId}/bom`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [] }),
      });
      if (!clearRes.ok) throw new Error('Clear failed');
      await load();
      setMsg('BOM reset to template.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const cellClass = 'px-2 py-1.5 text-sm border border-transparent rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition bg-transparent group-hover:bg-white group-hover:border-gray-200 w-full';

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Bill of Materials</h2>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={saving || loading}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Reset to template
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
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

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading BOM…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-6">#</th>
                  {COLS.map((col) => (
                    <th key={col} className="text-left px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {col}
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row, idx) => (
                  <tr key={row.clientKey} className="hover:bg-gray-50 transition group">
                    <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                    {COL_KEYS.map((col) => (
                      <td key={col} className="px-1 py-1">
                        <input
                          type="text"
                          value={row[col]}
                          onChange={(e) => setCell(row.clientKey, col, e.target.value)}
                          placeholder="—"
                          className={cellClass}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right">
                      <button
                        onClick={() => deleteRow(row.clientKey)}
                        className="text-gray-300 hover:text-red-400 transition text-lg leading-none"
                        title="Remove row"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add row */}
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
            <button
              onClick={addRow}
              className="text-sm text-primary hover:text-blue-700 font-medium transition"
            >
              + Add row
            </button>
          </div>
        </div>
      )}

      {!loading && (
        <p className="text-xs text-gray-400">
          {rows.length} component{rows.length !== 1 ? 's' : ''} · Click any cell to edit · Save when done
        </p>
      )}
    </div>
  );
}

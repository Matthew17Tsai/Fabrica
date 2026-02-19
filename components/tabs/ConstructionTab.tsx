'use client';

import { useState, useEffect, useCallback } from 'react';

interface ConstructionNote {
  id: string;
  section: string;
  content: string;
  sort_order: number;
}

interface EditSection {
  clientKey: string;
  section: string;
  content: string;
}

let _keyCounter = 0;
function nextKey() { return `sec_${++_keyCounter}`; }

function noteToEdit(note: ConstructionNote): EditSection {
  return { clientKey: note.id, section: note.section, content: note.content };
}

function emptySection(): EditSection {
  return { clientKey: nextKey(), section: '', content: '' };
}

interface Props {
  projectId: string;
}

export default function ConstructionTab({ projectId }: Props) {
  const [sections, setSections] = useState<EditSection[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/projects/${projectId}/construction`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load construction notes');
      setSections((data.construction as ConstructionNote[]).map(noteToEdit));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const setField = (key: string, field: 'section' | 'content', value: string) => {
    setSections((prev) => prev.map((s) => s.clientKey === key ? { ...s, [field]: value } : s));
  };

  const addSection = () => {
    setSections((prev) => [...prev, emptySection()]);
  };

  const deleteSection = (key: string) => {
    setSections((prev) => prev.filter((s) => s.clientKey !== key));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    setError('');
    const notes = sections.map((s, i) => ({
      section:    s.section,
      content:    s.content,
      sort_order: i,
    }));
    try {
      const res  = await fetch(`/api/projects/${projectId}/construction`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSections((data.construction as ConstructionNote[]).map(noteToEdit));
      setMsg('Construction notes saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset construction notes to template? This will overwrite your current notes.')) return;
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const clearRes = await fetch(`/api/projects/${projectId}/construction`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: [] }),
      });
      if (!clearRes.ok) throw new Error('Clear failed');
      await load();
      setMsg('Construction notes reset to template.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-gray-700">Construction Notes</h2>
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
        <div className="text-sm text-gray-400 py-8 text-center">Loading construction notes…</div>
      ) : (
        <div className="space-y-3">
          {sections.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-400 text-sm">No construction notes yet.</p>
            </div>
          )}

          {sections.map((sec, idx) => (
            <div
              key={sec.clientKey}
              className="bg-white rounded-xl border border-gray-200 p-4 group"
            >
              <div className="flex items-start gap-3">
                {/* Section number */}
                <span className="text-xs text-gray-400 font-mono mt-2 w-5 flex-shrink-0 text-right">
                  {idx + 1}
                </span>

                <div className="flex-1 space-y-2">
                  {/* Section name */}
                  <input
                    type="text"
                    value={sec.section}
                    onChange={(e) => setField(sec.clientKey, 'section', e.target.value)}
                    placeholder="Section name (e.g. Seams & Stitching)"
                    className="w-full text-sm font-semibold text-gray-800 px-2 py-1 border border-transparent rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition bg-transparent hover:bg-gray-50 focus:bg-white"
                  />

                  {/* Content */}
                  <textarea
                    value={sec.content}
                    onChange={(e) => setField(sec.clientKey, 'content', e.target.value)}
                    placeholder="Enter construction instructions…"
                    rows={4}
                    className="w-full text-sm text-gray-700 px-2 py-1.5 border border-gray-200 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition resize-y bg-gray-50 focus:bg-white"
                  />
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteSection(sec.clientKey)}
                  className="text-gray-300 hover:text-red-400 transition text-xl leading-none flex-shrink-0 mt-1"
                  title="Remove section"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {/* Add section */}
          <button
            onClick={addSection}
            className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:text-primary hover:border-primary transition"
          >
            + Add section
          </button>
        </div>
      )}

      {!loading && (
        <p className="text-xs text-gray-400">
          {sections.length} section{sections.length !== 1 ? 's' : ''} · Click any field to edit · Save when done
        </p>
      )}
    </div>
  );
}

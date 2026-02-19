'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface HasAssets {
  flat_front: boolean;
  flat_back: boolean;
}

interface Props {
  projectId: string;
  hasAssets: HasAssets;
  onRefresh: () => void;
}

export default function FlatSketchTab({ projectId, hasAssets, onRefresh }: Props) {
  const [view,        setView]        = useState<'front' | 'back'>('front');
  const [svgFront,    setSvgFront]    = useState<string | null>(null);
  const [svgBack,     setSvgBack]     = useState<string | null>(null);
  const [hasPngFront, setHasPngFront] = useState(false);
  const [hasPngBack,  setHasPngBack]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState('');
  const [uploadMsg,   setUploadMsg]   = useState('');
  const [loaded,      setLoaded]      = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Lazy-load sketch data when tab is first rendered
  const loadSketches = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/projects/${projectId}/flat-sketch`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load sketches');
      setSvgFront(data.front?.svg ?? null);
      setSvgBack(data.back?.svg ?? null);
      setHasPngFront(data.front?.has_png ?? false);
      setHasPngBack(data.back?.has_png ?? false);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [projectId, loaded]);

  useEffect(() => {
    if (hasAssets.flat_front || hasAssets.flat_back) {
      loadSketches();
    }
  }, [loadSketches, hasAssets.flat_front, hasAssets.flat_back]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('');
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('view', view);
      const res  = await fetch(`/api/projects/${projectId}/upload-refined-svg`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setUploadMsg(`Refined SVG saved (${(data.bytes / 1024).toFixed(1)} KB). ${data.png_saved ? 'PNG generated.' : ''}`);
      // Reload sketches
      setLoaded(false);
      onRefresh();
      await loadSketches();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const currentSvg   = view === 'front' ? svgFront : svgBack;
  const hasCurrent   = view === 'front' ? hasAssets.flat_front : hasAssets.flat_back;
  const hasPng       = view === 'front' ? hasPngFront : hasPngBack;
  const pngDownload  = `/api/projects/${projectId}/flat-sketch?view=${view}&format=png&download=1`;
  const svgDownload  = `/api/projects/${projectId}/export/svg?view=${view}`;

  return (
    <div className="space-y-4">
      {/* View toggle + download controls */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {(['front', 'back'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                view === v
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)} view
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {hasCurrent && (
            <>
              <a
                href={svgDownload}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Download SVG
              </a>
              {hasPng && (
                <a
                  href={pngDownload}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Download PNG
                </a>
              )}
            </>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload refined SVG'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* Sketch canvas */}
      <div className="bg-white rounded-xl border border-gray-200 min-h-[500px] flex items-center justify-center">
        {loading && (
          <div className="text-gray-400 text-sm">Loading sketch…</div>
        )}
        {!loading && !hasCurrent && (
          <div className="text-center space-y-3 p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">✏️</span>
            </div>
            <p className="text-gray-500 text-sm">
              No {view} view sketch yet.
              <br />Go to the Overview tab and click <strong>Generate flat sketch</strong>.
            </p>
          </div>
        )}
        {!loading && hasCurrent && currentSvg && (
          <div
            className="w-full max-h-[600px] p-6 flex items-center justify-center overflow-hidden"
            dangerouslySetInnerHTML={{ __html: currentSvg }}
          />
        )}
        {!loading && hasCurrent && !currentSvg && (
          <div className="text-gray-400 text-sm">Sketch exists but could not be displayed.</div>
        )}
      </div>

      {uploadMsg && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          {uploadMsg}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <p className="text-xs text-gray-400">
        Download the SVG to refine in Adobe Illustrator, then upload your refined version above.
        The refined file replaces the AI-generated sketch for this view.
      </p>
    </div>
  );
}
